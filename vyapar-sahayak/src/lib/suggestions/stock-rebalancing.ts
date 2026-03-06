import { prisma } from "@/lib/db";
import type { SuggestionInput } from "./types";

// Products idle in one zone but selling in another
export async function analyzeIdleVsActive(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // get all products with inventory for this distributor
  const products = await prisma.product.findMany({
    where: {
      inventory: { some: { distributorId, currentStock: { gt: 0 } } },
    },
    select: { id: true, name: true },
  });

  for (const product of products) {
    // get sales by zone in the last 14 days
    const salesByZone = await prisma.salesLineItem.groupBy({
      by: ["productId"],
      where: {
        productId: product.id,
        transaction: { date: { gte: fourteenDaysAgo } },
      },
      _sum: { quantity: true },
    });

    // get inventory by zone
    const inventoryByZone = await prisma.inventory.findMany({
      where: { distributorId, productId: product.id, currentStock: { gt: 0 } },
      select: { zoneCode: true, currentStock: true },
    });

    // get zone-level sales using raw approach
    const zones = await prisma.zone.findMany({
      where: { distributorId },
      include: {
        retailers: {
          include: {
            transactions: {
              where: { date: { gte: fourteenDaysAgo } },
              include: {
                lineItems: {
                  where: { productId: product.id },
                  select: { quantity: true },
                },
              },
            },
          },
        },
      },
    });

    const zoneSales: Record<string, number> = {};
    for (const zone of zones) {
      let totalQty = 0;
      for (const retailer of zone.retailers) {
        for (const txn of retailer.transactions) {
          for (const item of txn.lineItems) {
            totalQty += item.quantity;
          }
        }
      }
      zoneSales[zone.code] = totalQty;
    }

    // find idle zones with stock vs active zones
    const idleZones = inventoryByZone.filter(
      (inv) => (zoneSales[inv.zoneCode] || 0) === 0
    );
    const activeZones = Object.entries(zoneSales).filter(
      ([, qty]) => qty > 0
    );

    if (idleZones.length === 0 || activeZones.length === 0) continue;

    // sort active zones by sales desc to find best destination
    activeZones.sort((a, b) => b[1] - a[1]);
    const bestActive = activeZones[0];

    for (const idle of idleZones) {
      suggestions.push({
        type: "stock_rebalance",
        title: `${product.name}: ${idle.currentStock} cases idle in zone ${idle.zoneCode}, but zone ${bestActive[0]} sold ${bestActive[1]} cases last week. Move stock?`,
        description: `No sales of ${product.name} in zone ${idle.zoneCode} over the last 14 days, while zone ${bestActive[0]} has active demand.`,
        actionType: "transfer_stock",
        priority: "medium",
        actionPayload: {
          productId: product.id,
          fromZone: idle.zoneCode,
          toZone: bestActive[0],
          quantity: idle.currentStock,
        },
      });
    }
  }

  return suggestions;
}

// Products expiring within 30 days with remaining stock
export async function analyzeExpiryUrgency(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  const expiringInventory = await prisma.inventory.findMany({
    where: {
      distributorId,
      expiryDate: { lte: thirtyDaysFromNow },
      currentStock: { gt: 0 },
    },
    include: { product: { select: { name: true } } },
  });

  for (const inv of expiringInventory) {
    const daysToExpiry = Math.max(
      0,
      Math.round(
        (inv.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    suggestions.push({
      type: "stock_rebalance",
      title: `${inv.product.name} expires in ${daysToExpiry} days -- ${inv.currentStock} cases left. Push a flash sale?`,
      description: `Batch ${inv.batchNo} in zone ${inv.zoneCode} expires on ${inv.expiryDate.toISOString().split("T")[0]}.`,
      actionType: "flash_sale",
      priority: "high",
      actionPayload: {
        productId: inv.productId,
        zoneCode: inv.zoneCode,
      },
    });
  }

  return suggestions;
}

// Zone stock that will drop below 20% after recent orders
export async function analyzePostOrderDepletion(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const zones = await prisma.zone.findMany({
    where: { distributorId },
    include: {
      retailers: {
        include: {
          transactions: {
            where: { date: { gte: sevenDaysAgo } },
            include: {
              lineItems: { select: { productId: true, quantity: true } },
            },
          },
        },
      },
    },
  });

  // aggregate recent demand per zone-product
  const demandMap: Record<string, Record<string, number>> = {};
  for (const zone of zones) {
    demandMap[zone.code] = {};
    for (const retailer of zone.retailers) {
      for (const txn of retailer.transactions) {
        for (const item of txn.lineItems) {
          demandMap[zone.code][item.productId] =
            (demandMap[zone.code][item.productId] || 0) + item.quantity;
        }
      }
    }
  }

  for (const [zoneCode, products] of Object.entries(demandMap)) {
    for (const [productId, demandQty] of Object.entries(products)) {
      const inventory = await prisma.inventory.findMany({
        where: { distributorId, zoneCode, productId },
        include: { product: { select: { name: true } } },
      });

      const currentStock = inventory.reduce(
        (sum, inv) => sum + inv.currentStock,
        0
      );
      if (currentStock === 0) continue;

      const projectedStock = currentStock - demandQty;
      if (projectedStock < currentStock * 0.2) {
        // find a source zone with surplus
        const sourceInventory = await prisma.inventory.findMany({
          where: {
            distributorId,
            productId,
            zoneCode: { not: zoneCode },
            currentStock: { gt: 0 },
          },
          orderBy: { currentStock: "desc" },
          take: 1,
        });

        if (sourceInventory.length === 0) continue;

        const source = sourceInventory[0];
        const productName =
          inventory[0]?.product?.name || "Unknown Product";
        const remainingStr = Math.max(0, projectedStock);

        suggestions.push({
          type: "stock_rebalance",
          title: `After this week's orders, zone ${zoneCode} will have only ${remainingStr} cases of ${productName} left. Restock?`,
          description: `Current stock: ${currentStock}, recent demand: ${demandQty}. Zone ${source.zoneCode} has ${source.currentStock} cases available.`,
          actionType: "transfer_stock",
          priority: "medium",
          actionPayload: {
            productId,
            fromZone: source.zoneCode,
            toZone: zoneCode,
            quantity: Math.min(demandQty, source.currentStock),
          },
        });
      }
    }
  }

  return suggestions;
}
