// src/app/api/seed/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DISTRIBUTOR, ZONES, PRODUCTS, RETAILER_NAMES } from "@/lib/seed/data";
import { generateSalesHistory, generateInventory } from "@/lib/seed/generate";
import { subDays, subHours } from "date-fns";


function generateOrderToken(index: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "vyp_";
  const seed = index * 7919 + 104729;
  for (let i = 0; i < 10; i++) {
    token += chars[(seed * (i + 1) * 31) % chars.length];
  }
  return token;
}


export async function POST() {
  try {
    // Clear existing data (correct FK order -- children first)
    await prisma.dispatchBatchOrder.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.dispatchBatch.deleteMany();
    await prisma.agentSuggestion.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.recommendation.deleteMany();
    await prisma.deadStockAlert.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.salesLineItem.deleteMany();
    await prisma.salesTransaction.deleteMany();
    await prisma.whatsAppGroup.deleteMany();
    await prisma.retailer.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.product.deleteMany();
    await prisma.distributor.deleteMany();

    // Create distributor
    const dist = await prisma.distributor.create({ data: DISTRIBUTOR });

    // Create zones
    const zoneRecords: Record<string, string> = {};
    for (const z of ZONES) {
      const zone = await prisma.zone.create({
        data: { ...z, distributorId: dist.id },
      });
      zoneRecords[z.code] = zone.id;
    }

    // Create retailers
    const retailerMap: Record<string, string[]> = {};
    for (const [zoneCode, retailers] of Object.entries(RETAILER_NAMES)) {
      retailerMap[zoneCode] = [];
      const zoneId = zoneRecords[zoneCode];
      if (!zoneId) continue;

      for (const r of retailers) {
        const retailer = await prisma.retailer.create({
          data: {
            name: r.name,
            ownerName: r.owner,
            zoneId,
            type: r.type,
            town: r.town,
            whatsappNumber: `+9198${Math.floor(10000000 + Math.random() * 89999999)}`,
            creditLimit: r.type === "wholesale" ? 200000 : r.type === "supermarket" ? 100000 : 50000,
            avgMonthlyPurchase: r.type === "wholesale" ? 150000 : r.type === "supermarket" ? 80000 : 25000,
            segment: r.type === "wholesale" ? "platinum" : r.type === "supermarket" ? "gold" : "silver",
          },
        });
        retailerMap[zoneCode].push(retailer.id);
      }
    }

    // Create products
    const productMap: Record<string, string> = {};
    for (const p of PRODUCTS) {
      const product = await prisma.product.create({
        data: {
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          company: p.company,
          category: p.category,
          subCategory: p.subCategory,
          mrp: p.mrp,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          unitSize: p.unitSize,
          unitsPerCase: p.unitsPerCase,
          shelfLifeDays: p.shelfLifeDays,
        },
      });
      productMap[p.sku] = product.id;
    }

    // Generate 90 days of sales history
    const today = new Date();
    const startDate = subDays(today, 90);
    const salesData = generateSalesHistory(startDate, today);

    // Batch insert sales (group by day+retailer for transactions)
    const txnGroups = new Map<string, typeof salesData>();
    for (const sale of salesData) {
      const key = `${sale.date}-${sale.zoneCode}-${sale.retailerIdx}`;
      if (!txnGroups.has(key)) txnGroups.set(key, []);
      txnGroups.get(key)!.push(sale);
    }

    let invoiceCounter = 1;
    for (const [, items] of txnGroups) {
      const first = items[0];
      const retailerIds = retailerMap[first.zoneCode] || [];
      if (retailerIds.length === 0) continue;
      const retailerId = retailerIds[first.retailerIdx % retailerIds.length];

      const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

      await prisma.salesTransaction.create({
        data: {
          date: new Date(first.date),
          retailerId,
          invoiceNo: `KT-${invoiceCounter++}`,
          totalAmount: total,
          paymentStatus: Math.random() > 0.1 ? "paid" : "pending",
          lineItems: {
            create: items.map((item) => ({
              productId: productMap[item.productSku],
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: 0,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
      });
    }

    // Generate inventory
    const inventoryData = generateInventory(today, salesData);
    for (const inv of inventoryData) {
      await prisma.inventory.create({
        data: {
          productId: productMap[inv.productSku],
          distributorId: dist.id,
          zoneCode: inv.zoneCode,
          currentStock: inv.currentStock,
          batchNo: inv.batchNo,
          manufacturingDate: new Date(inv.manufacturingDate),
          expiryDate: new Date(inv.expiryDate),
          lastMovementDate: new Date(inv.lastMovementDate),
          status: "active",
        },
      });
    }

    // Create WhatsApp groups per zone + broadcast + VIP
    for (const z of ZONES) {
      const zoneId = zoneRecords[z.code];
      const retailerCount = (RETAILER_NAMES[z.code] || []).length;
      await prisma.whatsAppGroup.create({
        data: {
          distributorId: dist.id,
          zoneId,
          name: `${z.name} Retailers`,
          type: "zone_retailers",
          inviteLink: `https://chat.whatsapp.com/${z.code.replace("TN-", "").toLowerCase()}${Math.random().toString(36).slice(2, 10)}`,
          memberCount: retailerCount,
        },
      });
    }
    const totalRetailers = Object.values(RETAILER_NAMES).flat().length;
    await prisma.whatsAppGroup.create({
      data: {
        distributorId: dist.id,
        name: "All Retailers - Kalyan Traders",
        type: "broadcast",
        inviteLink: `https://chat.whatsapp.com/all${Math.random().toString(36).slice(2, 10)}`,
        memberCount: totalRetailers,
      },
    });
    await prisma.whatsAppGroup.create({
      data: {
        distributorId: dist.id,
        name: "Platinum & Gold Retailers",
        type: "segment",
        inviteLink: `https://chat.whatsapp.com/vip${Math.random().toString(36).slice(2, 10)}`,
        memberCount: Math.floor(totalRetailers * 0.3),
      },
    });

    // -- Demo orders, dispatch batches, and suggestions --

    // Pick some product SKUs for orders
    const orderProducts = PRODUCTS.slice(0, 8);
    const allProductSkus = orderProducts.map((p) => p.sku);

    // Demo order specs: zone, retailer index within zone, status, product SKUs, hours ago
    const orderSpecs = [
      { zone: "TN-URB", rIdx: 0, status: "dispatched", skus: [allProductSkus[0], allProductSkus[1]], hoursAgo: 48 },
      { zone: "TN-URB", rIdx: 2, status: "dispatched", skus: [allProductSkus[2]], hoursAgo: 36 },
      { zone: "TN-URB", rIdx: 4, status: "confirmed", skus: [allProductSkus[0], allProductSkus[3]], hoursAgo: 24 },
      { zone: "TN-URB", rIdx: 6, status: "pending", skus: [allProductSkus[1]], hoursAgo: 6 },
      { zone: "TN-TWN", rIdx: 0, status: "confirmed", skus: [allProductSkus[4]], hoursAgo: 18 },
      { zone: "TN-TWN", rIdx: 1, status: "pending", skus: [allProductSkus[0], allProductSkus[5]], hoursAgo: 4 },
      { zone: "TN-TWN", rIdx: 3, status: "pending", skus: [allProductSkus[6]], hoursAgo: 2 },
      { zone: "TN-NAN", rIdx: 0, status: "confirmed", skus: [allProductSkus[2], allProductSkus[7]], hoursAgo: 12 },
      { zone: "TN-NAN", rIdx: 2, status: "pending", skus: [allProductSkus[0]], hoursAgo: 3 },
      { zone: "TN-AMB", rIdx: 0, status: "pending", skus: [allProductSkus[3], allProductSkus[4]], hoursAgo: 8 },
      { zone: "TN-CHE", rIdx: 1, status: "pending", skus: [allProductSkus[5]], hoursAgo: 1 },
    ];

    const dispatchedOrderIds: string[] = [];
    let orderTokenIdx = 0;

    for (const spec of orderSpecs) {
      const retailerIds = retailerMap[spec.zone] || [];
      if (retailerIds.length === 0) continue;
      const retailerId = retailerIds[spec.rIdx % retailerIds.length];

      const items = spec.skus.map((sku) => {
        const prod = PRODUCTS.find((p) => p.sku === sku)!;
        const qty = Math.floor(Math.random() * 4) + 1;
        return {
          productId: productMap[sku],
          quantity: qty,
          unitPrice: prod.sellingPrice,
          discount: 0,
          total: qty * prod.sellingPrice,
        };
      });

      const totalAmount = items.reduce((s, i) => s + i.total, 0);
      const createdAt = subHours(today, spec.hoursAgo);

      const order = await prisma.order.create({
        data: {
          token: generateOrderToken(orderTokenIdx++),
          retailerId,
          distributorId: dist.id,
          status: spec.status,
          totalAmount,
          zoneCode: spec.zone,
          createdAt,
          confirmedAt: ["confirmed", "dispatched"].includes(spec.status) ? subHours(today, spec.hoursAgo - 1) : undefined,
          dispatchedAt: spec.status === "dispatched" ? subHours(today, spec.hoursAgo - 2) : undefined,
          items: { create: items },
        },
      });

      if (spec.status === "dispatched") {
        dispatchedOrderIds.push(order.id);
      }
    }

    // Create dispatch batch for TN-URB with dispatched orders
    let batchCount = 0;
    if (dispatchedOrderIds.length > 0) {
      await prisma.dispatchBatch.create({
        data: {
          distributorId: dist.id,
          zoneCode: "TN-URB",
          status: "dispatched",
          vehicleInfo: "TN-72-AB-1234",
          plannedDate: subDays(today, 1),
          dispatchedAt: today,
          orders: {
            create: dispatchedOrderIds.map((orderId) => ({ orderId })),
          },
        },
      });
      batchCount = 1;
    }

    // Seed agent suggestions
    const suggestions = [
      {
        type: "order_intelligence",
        title: "8 orders in TN-URB ready to batch",
        description: "You have 4 orders from Urban Tirunelveli today worth Rs.12.5K total. Create a dispatch batch to send them together?",
        actionType: "create_batch",
        actionPayload: JSON.stringify({ zoneCode: "TN-URB" }),
        priority: "high",
      },
      {
        type: "stock_rebalance",
        title: "Move Complan stock from TN-CHE to TN-URB",
        description: "Complan NutriGro has 40 cases idle in Cheranmahadevi but Urban Tirunelveli sold 15 cases last week. Transfer 20 cases?",
        actionType: "transfer_stock",
        actionPayload: JSON.stringify({ productSku: "COMPLAN-NG-500", fromZone: "TN-CHE", toZone: "TN-URB", quantity: 20 }),
        priority: "medium",
      },
      {
        type: "campaign_performance",
        title: "Arun Badam campaign needs a reminder",
        description: "Your Arun Badam 1L campaign reached 120 retailers 3 days ago -- 8 orders so far (6.7% conversion). Send a reminder to the other 112?",
        actionType: "send_reminder",
        actionPayload: JSON.stringify({ campaignProduct: "Arun Badam 1L" }),
        priority: "medium",
      },
      {
        type: "order_intelligence",
        title: "Murugan Stores hasn't ordered in 18 days",
        description: "Murugan Stores in TN-NAN usually orders weekly but last order was 18 days ago. Send a check-in message on WhatsApp?",
        actionType: "send_checkin",
        actionPayload: JSON.stringify({ retailerName: "Murugan Stores", zoneCode: "TN-NAN" }),
        priority: "low",
      },
    ];

    await prisma.agentSuggestion.createMany({
      data: suggestions.map((s) => ({
        distributorId: dist.id,
        ...s,
      })),
    });

    const stats = {
      distributor: dist.name,
      zones: ZONES.length,
      retailers: Object.values(RETAILER_NAMES).flat().length,
      products: PRODUCTS.length,
      salesTransactions: txnGroups.size,
      inventoryRecords: inventoryData.length,
      whatsappGroups: ZONES.length + 2,
      orders: orderSpecs.length,
      ordersByStatus: {
        pending: orderSpecs.filter((o) => o.status === "pending").length,
        confirmed: orderSpecs.filter((o) => o.status === "confirmed").length,
        dispatched: orderSpecs.filter((o) => o.status === "dispatched").length,
      },
      dispatchBatches: batchCount,
      agentSuggestions: suggestions.length,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
