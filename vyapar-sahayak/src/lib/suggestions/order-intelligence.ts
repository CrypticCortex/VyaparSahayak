import { prisma } from "@/lib/db";
import type { SuggestionInput } from "./types";

// Retailers who haven't ordered in longer than 1.5x their average frequency
export async function analyzeRetailerActivity(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const zones = await prisma.zone.findMany({
    where: { distributorId },
    select: { id: true },
  });
  const zoneIds = zones.map((z) => z.id);

  const retailers = await prisma.retailer.findMany({
    where: { zoneId: { in: zoneIds } },
    include: {
      transactions: {
        orderBy: { date: "asc" },
        select: { date: true },
      },
    },
  });

  const now = Date.now();

  for (const retailer of retailers) {
    const txns = retailer.transactions;
    if (txns.length < 2) continue;

    // compute average days between orders
    let totalDays = 0;
    for (let i = 1; i < txns.length; i++) {
      totalDays +=
        (txns[i].date.getTime() - txns[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24);
    }
    const avgFrequency = totalDays / (txns.length - 1);

    const daysSinceLast =
      (now - txns[txns.length - 1].date.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast > avgFrequency * 1.5) {
      const freqLabel =
        avgFrequency <= 10
          ? "weekly"
          : avgFrequency <= 20
            ? "bi-weekly"
            : "monthly";

      suggestions.push({
        type: "order_intelligence",
        title: `${retailer.name} hasn't ordered in ${Math.round(daysSinceLast)} days -- they usually order ${freqLabel}. Check in?`,
        description: `Average order frequency is ${Math.round(avgFrequency)} days. Last order was ${Math.round(daysSinceLast)} days ago.`,
        actionType: "send_checkin",
        priority: "high",
        actionPayload: {
          retailerId: retailer.id,
          retailerName: retailer.name,
        },
      });
    }
  }

  return suggestions;
}

// Zones with 3+ recent transactions -- suggest creating a dispatch batch
export async function analyzeZoneOrderClusters(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  // recent transactions in last 7 days as "pending" proxy
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const zones = await prisma.zone.findMany({
    where: { distributorId },
    include: {
      retailers: {
        include: {
          transactions: {
            where: { date: { gte: sevenDaysAgo } },
            select: { totalAmount: true },
          },
        },
      },
    },
  });

  for (const zone of zones) {
    const recentTxns = zone.retailers.flatMap((r) => r.transactions);
    if (recentTxns.length < 3) continue;

    const totalValue = recentTxns.reduce((sum, t) => sum + t.totalAmount, 0);
    const valueStr =
      totalValue >= 1000
        ? `Rs.${(totalValue / 1000).toFixed(0)}K`
        : `Rs.${totalValue.toFixed(0)}`;

    suggestions.push({
      type: "order_intelligence",
      title: `${recentTxns.length} orders from zone ${zone.code} this week worth ${valueStr} -- create a dispatch batch?`,
      description: `Zone ${zone.name} has ${recentTxns.length} recent orders totaling ${valueStr}.`,
      actionType: "create_batch",
      priority: "medium",
      actionPayload: { zoneCode: zone.code },
    });
  }

  return suggestions;
}

// Orders significantly larger than a retailer's average
export async function analyzeLargeOrders(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const zones = await prisma.zone.findMany({
    where: { distributorId },
    select: { id: true },
  });
  const zoneIds = zones.map((z) => z.id);

  const retailers = await prisma.retailer.findMany({
    where: { zoneId: { in: zoneIds } },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        select: { id: true, totalAmount: true, date: true },
      },
    },
  });

  for (const retailer of retailers) {
    const txns = retailer.transactions;
    if (txns.length < 2) continue;

    // check if the most recent transaction is within last 7 days
    const latest = txns[0];
    if (latest.date < sevenDaysAgo) continue;

    // average of older transactions
    const olderTxns = txns.slice(1);
    const avgAmount =
      olderTxns.reduce((sum, t) => sum + t.totalAmount, 0) / olderTxns.length;

    if (avgAmount > 0 && latest.totalAmount >= avgAmount * 3) {
      const latestStr =
        latest.totalAmount >= 1000
          ? `Rs.${(latest.totalAmount / 1000).toFixed(0)}K`
          : `Rs.${latest.totalAmount.toFixed(0)}`;
      const avgStr =
        avgAmount >= 1000
          ? `Rs.${(avgAmount / 1000).toFixed(0)}K`
          : `Rs.${avgAmount.toFixed(0)}`;

      suggestions.push({
        type: "order_intelligence",
        title: `Large order from ${retailer.name} -- ${latestStr} vs ${avgStr} average. Confirm stock availability?`,
        description: `This order is ${(latest.totalAmount / avgAmount).toFixed(1)}x larger than ${retailer.name}'s average.`,
        actionType: "confirm_stock",
        priority: "high",
        actionPayload: { orderId: latest.id },
      });
    }
  }

  return suggestions;
}

// Recent order quantities exceeding zone inventory
export async function analyzeStockVsOrders(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // get recent line items grouped by product and zone
  const zones = await prisma.zone.findMany({
    where: { distributorId },
    include: {
      retailers: {
        include: {
          transactions: {
            where: { date: { gte: sevenDaysAgo } },
            include: {
              lineItems: {
                select: { productId: true, quantity: true },
              },
            },
          },
        },
      },
    },
  });

  // aggregate demand per product per zone
  const demandMap: Record<string, Record<string, number>> = {};
  for (const zone of zones) {
    for (const retailer of zone.retailers) {
      for (const txn of retailer.transactions) {
        for (const item of txn.lineItems) {
          if (!demandMap[zone.code]) demandMap[zone.code] = {};
          demandMap[zone.code][item.productId] =
            (demandMap[zone.code][item.productId] || 0) + item.quantity;
        }
      }
    }
  }

  // check inventory for each zone-product
  for (const [zoneCode, products] of Object.entries(demandMap)) {
    for (const [productId, demandQty] of Object.entries(products)) {
      const inventory = await prisma.inventory.findMany({
        where: { distributorId, zoneCode, productId },
      });
      const zoneStock = inventory.reduce(
        (sum, inv) => sum + inv.currentStock,
        0
      );

      if (demandQty > zoneStock) {
        // find another zone with surplus
        const otherInventory = await prisma.inventory.findMany({
          where: {
            distributorId,
            productId,
            zoneCode: { not: zoneCode },
            currentStock: { gt: 0 },
          },
          orderBy: { currentStock: "desc" },
          take: 1,
          include: { product: { select: { name: true } } },
        });

        if (otherInventory.length === 0) continue;

        const source = otherInventory[0];
        const transferQty = Math.min(
          demandQty - zoneStock,
          source.currentStock
        );

        suggestions.push({
          type: "order_intelligence",
          title: `Retailers ordered ${demandQty} cases of ${source.product.name} but zone ${zoneCode} has only ${zoneStock} left. Transfer from ${source.zoneCode}?`,
          description: `Demand exceeds supply by ${demandQty - zoneStock} cases. Zone ${source.zoneCode} has ${source.currentStock} cases available.`,
          actionType: "transfer_stock",
          priority: "high",
          actionPayload: {
            productId,
            fromZone: source.zoneCode,
            toZone: zoneCode,
            quantity: transferQty,
          },
        });
      }
    }
  }

  return suggestions;
}
