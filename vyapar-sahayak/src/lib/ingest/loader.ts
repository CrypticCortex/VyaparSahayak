import { prisma } from "@/lib/db";
import { extractFeatures } from "@/lib/ml/features";
import { scoreDeadStock } from "@/lib/ml/scoring";
import { invalidateAfterDetection, invalidateDashboard } from "@/lib/cache";
import { generateSKU } from "./transforms";
import type { PreviewRow, ColumnMapping, IngestStats } from "./types";


export async function commitIngestion(
  rows: PreviewRow[],
  entityType: string,
  _mappings: ColumnMapping[],
  duplicateResolutions: Record<string, { action: string; existingId?: string }>,
): Promise<IngestStats> {
  const stats: IngestStats = {
    productsCreated: 0,
    productsUpdated: 0,
    retailersCreated: 0,
    inventoryCreated: 0,
    salesTransactions: 0,
    errorsSkipped: 0,
    deadStockAlerts: 0,
  };

  // Get the distributor (single-tenant for now)
  const distributor = await prisma.distributor.findFirst();
  if (!distributor) {
    throw new Error("No distributor found. Run seed first.");
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const data = row.mapped;

      // Check for duplicate resolution
      const productName = String(data.name || data.productName || "");
      const resolution = duplicateResolutions[productName];

      if (resolution?.action === "skip") {
        stats.errorsSkipped++;
        continue;
      }

      switch (entityType) {
        case "products":
        case "product": {
          if (resolution?.action === "merge" && resolution.existingId) {
            // Update existing product
            await tx.product.update({
              where: { id: resolution.existingId },
              data: buildProductUpdate(data),
            });
            stats.productsUpdated++;
          } else {
            // Create new product
            const sku = String(data.sku || "") || generateSKU(
              String(data.name || ""),
              String(data.brand || "Unknown"),
              String(data.category || "General"),
            );

            // Ensure SKU is unique by appending a counter if needed
            const existingSku = await tx.product.findUnique({ where: { sku } });
            const finalSku = existingSku ? `${sku}-${Date.now().toString(36)}` : sku;

            await tx.product.create({
              data: {
                sku: finalSku,
                name: String(data.name || data.productName || "Unnamed Product"),
                brand: String(data.brand || "Unknown"),
                company: String(data.company || data.brand || "Unknown"),
                category: String(data.category || "General"),
                subCategory: String(data.subCategory || ""),
                mrp: toFloat(data.mrp, 0),
                costPrice: toFloat(data.costPrice, 0),
                sellingPrice: toFloat(data.sellingPrice, toFloat(data.mrp, 0)),
                unitSize: String(data.unitSize || ""),
                unitsPerCase: toInt(data.unitsPerCase, 1),
                shelfLifeDays: toInt(data.shelfLifeDays, 365),
              },
            });
            stats.productsCreated++;
          }
          break;
        }

        case "retailers":
        case "retailer": {
          // Find zone -- use first zone as default
          const zones = await tx.zone.findMany({ where: { distributorId: distributor.id } });
          const zone = zones[0];
          if (!zone) break;

          await tx.retailer.create({
            data: {
              name: String(data.name || data.retailerName || "Unnamed Retailer"),
              ownerName: String(data.ownerName || ""),
              zoneId: zone.id,
              type: String(data.type || "kirana"),
              town: String(data.town || data.location || ""),
              whatsappNumber: String(data.whatsappNumber || data.phone || ""),
              creditLimit: toFloat(data.creditLimit, 0),
              avgMonthlyPurchase: toFloat(data.avgMonthlyPurchase, 0),
              segment: String(data.segment || "silver"),
            },
          });
          stats.retailersCreated++;
          break;
        }

        case "inventory": {
          // Find product by name or SKU
          const pName = String(data.productName || data.name || "");
          const pSku = String(data.sku || "");

          let product = null;
          if (pSku) {
            product = await tx.product.findUnique({ where: { sku: pSku } });
          }
          if (!product && pName) {
            product = await tx.product.findFirst({
              where: { name: { contains: pName, mode: "insensitive" } },
            });
          }

          if (!product) {
            stats.errorsSkipped++;
            continue;
          }

          await tx.inventory.create({
            data: {
              productId: product.id,
              distributorId: distributor.id,
              zoneCode: String(data.zoneCode || "Z1"),
              currentStock: toInt(data.currentStock, 0),
              batchNo: String(data.batchNo || `B-${Date.now().toString(36)}`),
              manufacturingDate: toDate(data.manufacturingDate) || new Date(),
              expiryDate: toDate(data.expiryDate) || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
              lastMovementDate: toDate(data.lastMovementDate) || new Date(),
            },
          });
          stats.inventoryCreated++;
          break;
        }

        case "sales": {
          // Find retailer by name
          const rName = String(data.retailerName || data.party || "");
          let retailer = null;
          if (rName) {
            retailer = await tx.retailer.findFirst({
              where: { name: { contains: rName, mode: "insensitive" } },
            });
          }
          if (!retailer) {
            // Fall back to first retailer
            retailer = await tx.retailer.findFirst();
          }
          if (!retailer) {
            stats.errorsSkipped++;
            continue;
          }

          const txn = await tx.salesTransaction.create({
            data: {
              date: toDate(data.date) || new Date(),
              retailerId: retailer.id,
              invoiceNo: String(data.invoiceNo || `INV-${Date.now().toString(36)}`),
              totalAmount: toFloat(data.totalAmount, 0),
              paymentStatus: String(data.paymentStatus || "paid"),
            },
          });

          // If line item fields are present, create a line item too
          const prdName = String(data.productName || data.name || "");
          if (prdName || data.quantity) {
            let product = null;
            if (prdName) {
              product = await tx.product.findFirst({
                where: { name: { contains: prdName, mode: "insensitive" } },
              });
            }
            if (product) {
              await tx.salesLineItem.create({
                data: {
                  transactionId: txn.id,
                  productId: product.id,
                  quantity: toInt(data.quantity, 1),
                  unitPrice: toFloat(data.unitPrice, toFloat(data.totalAmount, 0)),
                  discount: toFloat(data.discount, 0),
                  total: toFloat(data.lineTotal ?? data.totalAmount, 0),
                },
              });
            }
          }

          stats.salesTransactions++;
          break;
        }

        case "mixed": {
          // Route based on which fields are populated
          if (data.currentStock !== undefined && data.currentStock !== null) {
            // Treat as inventory row -- find product
            const pName = String(data.productName || data.name || "");
            const product = pName
              ? await tx.product.findFirst({ where: { name: { contains: pName, mode: "insensitive" } } })
              : null;
            if (product) {
              await tx.inventory.create({
                data: {
                  productId: product.id,
                  distributorId: distributor.id,
                  zoneCode: String(data.zoneCode || "Z1"),
                  currentStock: toInt(data.currentStock, 0),
                  batchNo: String(data.batchNo || `B-${Date.now().toString(36)}`),
                  manufacturingDate: toDate(data.manufacturingDate) || new Date(),
                  expiryDate: toDate(data.expiryDate) || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                  lastMovementDate: new Date(),
                },
              });
              stats.inventoryCreated++;
            }
          } else if (data.totalAmount !== undefined) {
            // Treat as sales
            const retailer = await tx.retailer.findFirst();
            if (retailer) {
              await tx.salesTransaction.create({
                data: {
                  date: toDate(data.date) || new Date(),
                  retailerId: retailer.id,
                  invoiceNo: String(data.invoiceNo || `INV-${Date.now().toString(36)}`),
                  totalAmount: toFloat(data.totalAmount, 0),
                  paymentStatus: "paid",
                },
              });
              stats.salesTransactions++;
            }
          } else if (data.name || data.productName) {
            // Treat as product
            const sku = String(data.sku || "") || generateSKU(
              String(data.name || data.productName || ""),
              String(data.brand || "Unknown"),
              String(data.category || "General"),
            );
            const existingSku = await tx.product.findUnique({ where: { sku } });
            const finalSku = existingSku ? `${sku}-${Date.now().toString(36)}` : sku;

            await tx.product.create({
              data: {
                sku: finalSku,
                name: String(data.name || data.productName || "Unnamed"),
                brand: String(data.brand || "Unknown"),
                company: String(data.company || "Unknown"),
                category: String(data.category || "General"),
                subCategory: String(data.subCategory || ""),
                mrp: toFloat(data.mrp, 0),
                costPrice: toFloat(data.costPrice, 0),
                sellingPrice: toFloat(data.sellingPrice, 0),
                unitSize: String(data.unitSize || ""),
                unitsPerCase: toInt(data.unitsPerCase, 1),
                shelfLifeDays: toInt(data.shelfLifeDays, 365),
              },
            });
            stats.productsCreated++;
          }
          break;
        }
      }
    }
  });

  // Run dead stock detection if inventory or sales data was ingested
  if (stats.inventoryCreated > 0 || stats.salesTransactions > 0) {
    try {
      const features = await extractFeatures(distributor.id);
      const scored = scoreDeadStock(features);
      const atRisk = scored.filter((s) => s.riskLevel !== "healthy");
      stats.deadStockAlerts = atRisk.length;
    } catch (err) {
      console.error("[loader] Dead stock detection after ingest failed:", err);
    }
  }

  // Invalidate caches so dashboard reflects new data
  try {
    invalidateDashboard();
    if (stats.inventoryCreated > 0) {
      invalidateAfterDetection();
    }
  } catch {
    // Cache invalidation is best-effort in non-Next.js contexts
  }

  return stats;
}


function toFloat(val: unknown, fallback: number): number {
  if (val === null || val === undefined || val === "") return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}


function toInt(val: unknown, fallback: number): number {
  if (val === null || val === undefined || val === "") return fallback;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? fallback : n;
}


function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}


function buildProductUpdate(data: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (data.brand) update.brand = String(data.brand);
  if (data.company) update.company = String(data.company);
  if (data.category) update.category = String(data.category);
  if (data.subCategory) update.subCategory = String(data.subCategory);
  if (data.mrp) update.mrp = toFloat(data.mrp, 0);
  if (data.costPrice) update.costPrice = toFloat(data.costPrice, 0);
  if (data.sellingPrice) update.sellingPrice = toFloat(data.sellingPrice, 0);
  if (data.unitSize) update.unitSize = String(data.unitSize);
  if (data.unitsPerCase) update.unitsPerCase = toInt(data.unitsPerCase, 1);
  if (data.shelfLifeDays) update.shelfLifeDays = toInt(data.shelfLifeDays, 365);

  return update;
}
