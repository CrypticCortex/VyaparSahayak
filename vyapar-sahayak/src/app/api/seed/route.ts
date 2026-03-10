// src/app/api/seed/route.ts

export const maxDuration = 120;

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
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

    // Run dead stock detection inline to populate alerts
    const { extractFeatures } = await import("@/lib/ml/features");
    const { scoreDeadStock } = await import("@/lib/ml/scoring");
    const { generateRecommendation } = await import("@/lib/ml/recommendations");

    const features = await extractFeatures(dist.id);
    const scored = scoreDeadStock(features);
    const atRisk = scored.filter((s) => s.riskLevel === "high" || s.riskLevel === "medium");

    const alertIds: string[] = [];
    for (const sku of atRisk) {
      const rec = generateRecommendation(sku, scored);
      const alert = await prisma.deadStockAlert.create({
        data: {
          distributorId: dist.id,
          productId: sku.productId,
          zoneCode: sku.zoneCode,
          score: sku.deadStockScore,
          riskLevel: sku.riskLevel,
          daysSinceLastSale: sku.daysSinceLastSale,
          weeksOfCover: sku.weeksOfCover,
          velocityRatio: sku.velocityRatio,
          daysToExpiry: sku.daysToExpiry,
          stockValue: sku.currentStockValue,
          recommendationType: rec.type,
          recommendationJson: JSON.stringify(rec),
        },
      });
      alertIds.push(alert.id);
    }

    // Create demo recommendations and campaigns for top 3 alerts
    const campaignProducts = [
      { alertIdx: 0, headline: "சிறப்பு விற்பனை!", message: "வணக்கம்! 🙏\n\nKalyan Traders-ல் இருந்து சிறப்பு offer!\n\n20% OFF - Limited stock!\n\nஉடனே order செய்யுங்கள்! 📞 98765 43210\n\n#KalyanTraders #SpecialOffer #Tirunelveli" },
      { alertIdx: 2, headline: "அதிரடி தள்ளுபடி!", message: "வணக்கம்! 🙏\n\nKalyan Traders special clearance!\n\n25% OFF on selected items!\n\nStock limited - order today!\n📞 98765 43210\n\n#ClearanceSale #KalyanTraders" },
      { alertIdx: 4, headline: "மெகா சேல்!", message: "நமஸ்காரம்! 🙏\n\nMega sale at Kalyan Traders!\n\n15% OFF - இன்றே order செய்யுங்கள்!\n\n📞 98765 43210\n\n#MegaSale #Tirunelveli" },
    ];

    for (const cp of campaignProducts) {
      if (cp.alertIdx >= alertIds.length) continue;
      const alertId = alertIds[cp.alertIdx];
      const alertData = atRisk[cp.alertIdx];
      const mlRec = generateRecommendation(alertData, scored);

      const rec = await prisma.recommendation.create({
        data: {
          alertId,
          type: mlRec.type,
          targetZone: mlRec.targetZone,
          bundleWith: mlRec.bundleWithName,
          discountPct: mlRec.discountPct || 20,
          estimatedRecovery: mlRec.estimatedRecovery,
          rationale: JSON.stringify(mlRec),
          status: "approved",
        },
      });

      await prisma.deadStockAlert.update({
        where: { id: alertId },
        data: { status: "approved" },
      });

      const statusChoice = cp.alertIdx === 0 ? "sent" : "draft";
      await prisma.campaign.create({
        data: {
          recommendationId: rec.id,
          distributorId: dist.id,
          productName: alertData.productName,
          posterUrl: null,
          whatsappMessage: cp.message,
          offerHeadline: cp.headline,
          offerDetails: JSON.stringify({ headline: cp.headline }),
          orderLink: generateOrderToken(100 + cp.alertIdx),
          status: statusChoice,
          sentAt: statusChoice === "sent" ? subDays(today, 3) : undefined,
          targetGroups: ZONES.slice(0, 3).map(z => z.name).join(","),
        },
      });
    }

    // Seed agent suggestions
    const suggestions = [
      {
        type: "order_intelligence",
        title: "6 orders in TN-URB ready to batch",
        description: "You have 4 orders from Urban Tirunelveli today worth Rs.8.5K total. Create a dispatch batch to send them together?",
        actionType: "create_batch",
        actionPayload: JSON.stringify({ zoneCode: "TN-URB" }),
        priority: "high",
      },
      {
        type: "stock_rebalance",
        title: "Move Complan stock from TN-AMB to TN-URB",
        description: "Complan NutriGro has 30 cases idle in Ambasamudram but Urban Tirunelveli sold 12 cases last week. Transfer 15 cases?",
        actionType: "transfer_stock",
        actionPayload: JSON.stringify({ productSku: "BEV-CNG-500", fromZone: "TN-AMB", toZone: "TN-URB", quantity: 15 }),
        priority: "medium",
      },
      {
        type: "stock_rebalance",
        title: "Lays batch expires in 18 days",
        description: "45 cases of Lays Classic in TN-NAN expire soon. Push a flash sale to Nanguneri retailers before they're written off?",
        actionType: "flash_sale",
        actionPayload: JSON.stringify({ productSku: "SNK-LAY-030", zoneCode: "TN-NAN" }),
        priority: "high",
      },
      {
        type: "order_intelligence",
        title: "Marie Gold running low in TN-URB",
        description: "Britannia Marie Gold has only 2 days of stock left in Urban Tirunelveli. Reorder 10 cases to avoid stockout?",
        actionType: "reorder",
        actionPayload: JSON.stringify({ productSku: "BIS-MAR-250", zoneCode: "TN-URB", quantity: 10 }),
        priority: "high",
      },
      {
        type: "order_intelligence",
        title: "Selvam Stores hasn't ordered in 18 days",
        description: "Selvam Stores in Nanguneri usually orders weekly but last order was 18 days ago. Send a check-in message on WhatsApp?",
        actionType: "send_checkin",
        actionPayload: JSON.stringify({ retailerName: "Selvam Stores", zoneCode: "TN-NAN" }),
        priority: "low",
      },
      {
        type: "campaign_performance",
        title: "Fortune Oil clearance: 12% conversion so far",
        description: "Your Fortune Sunflower Oil clearance campaign reached 20 retailers 3 days ago -- 3 orders so far. Send a reminder to boost conversion?",
        actionType: "send_reminder",
        actionPayload: JSON.stringify({ campaignProduct: "Fortune Sunflower Oil 1L" }),
        priority: "medium",
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
      deadStockAlerts: atRisk.length,
      deadStockValue: Math.round(atRisk.reduce((s, a) => s + a.currentStockValue, 0)),
      campaigns: campaignProducts.length,
      agentSuggestions: suggestions.length,
    };

    // Invalidate data cache so /demo picks up fresh data
    revalidateTag("dashboard", "max");
    revalidateTag("alerts", "max");
    revalidateTag("network", "max");
    revalidateTag("campaigns", "max");
    revalidatePath("/demo", "layout");

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}


// DELETE: clear all data without re-seeding (for demo reset)
export async function DELETE() {
  try {
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

    // Bust both unstable_cache tags and page cache
    const { revalidateTag } = await import("next/cache");
    revalidateTag("dashboard", "max");
    revalidateTag("alerts", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("network", "max");
    revalidatePath("/demo", "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
