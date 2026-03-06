import { prisma } from "@/lib/db";
import type { SuggestionInput } from "./types";

// Campaigns with partial conversion -- suggest reminders
export async function analyzeCampaignConversion(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const campaigns = await prisma.campaign.findMany({
    where: { distributorId, status: "sent" },
    include: {
      recommendation: true,
    },
  });

  for (const campaign of campaigns) {
    // get target zone retailers count from targetGroups
    const targetGroups = campaign.targetGroups;
    if (!targetGroups) continue;

    // count retailers in target zones
    const zoneNames = targetGroups.split(",").map((s) => s.trim());
    const targetZones = await prisma.zone.findMany({
      where: {
        distributorId,
        name: { in: zoneNames },
      },
      include: { _count: { select: { retailers: true } } },
    });

    const totalTargeted = targetZones.reduce(
      (sum, z) => sum + z._count.retailers,
      0
    );
    if (totalTargeted === 0) continue;

    // count orders after campaign sentAt
    if (!campaign.sentAt) continue;

    const zoneIds = targetZones.map((z) => z.id);
    const ordersAfterCampaign = await prisma.salesTransaction.findMany({
      where: {
        date: { gte: campaign.sentAt },
        retailer: { zoneId: { in: zoneIds } },
      },
      select: { retailerId: true },
    });

    const uniqueOrderingRetailers = new Set(
      ordersAfterCampaign.map((o) => o.retailerId)
    );
    const conversion = uniqueOrderingRetailers.size / totalTargeted;

    if (conversion > 0 && conversion < 1) {
      const pct = Math.round(conversion * 100);
      const remaining = totalTargeted - uniqueOrderingRetailers.size;

      suggestions.push({
        type: "campaign_performance",
        title: `${campaign.productName} campaign: ${totalTargeted} retailers reached, ${uniqueOrderingRetailers.size} orders (${pct}% conversion). Send reminder to the other ${remaining}?`,
        description: `Campaign sent on ${campaign.sentAt.toISOString().split("T")[0]}. ${remaining} retailers haven't ordered yet.`,
        actionType: "send_reminder",
        priority: "medium",
        actionPayload: { campaignId: campaign.id },
      });
    }
  }

  return suggestions;
}

// Zone-level breakdown of campaign response
export async function analyzeZoneConversion(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const campaigns = await prisma.campaign.findMany({
    where: { distributorId, status: "sent" },
    include: { recommendation: true },
  });

  // track best conversion for "best ever" detection
  let bestConversion = 0;
  let bestCampaign: (typeof campaigns)[0] | null = null;

  for (const campaign of campaigns) {
    if (!campaign.sentAt || !campaign.targetGroups) continue;

    const zoneNames = campaign.targetGroups.split(",").map((s) => s.trim());
    const targetZones = await prisma.zone.findMany({
      where: { distributorId, name: { in: zoneNames } },
      include: {
        retailers: {
          include: {
            transactions: {
              where: { date: { gte: campaign.sentAt } },
              select: { id: true },
            },
          },
        },
      },
    });

    let totalRetailers = 0;
    let totalOrdering = 0;

    for (const zone of targetZones) {
      const zoneRetailers = zone.retailers.length;
      const zoneOrdering = zone.retailers.filter(
        (r) => r.transactions.length > 0
      ).length;

      totalRetailers += zoneRetailers;
      totalOrdering += zoneOrdering;

      // zero-order zones
      if (zoneRetailers > 0 && zoneOrdering === 0) {
        suggestions.push({
          type: "campaign_performance",
          title: `Zone ${zone.code} had zero orders from ${campaign.productName} campaign. Try a bigger discount or different product?`,
          description: `${zoneRetailers} retailers in zone ${zone.code} received the campaign but none ordered.`,
          actionType: "flash_sale",
          priority: "medium",
          actionPayload: {
            productId: campaign.recommendation?.alertId || "",
            zoneCode: zone.code,
          },
        });
      }
    }

    // track best conversion
    if (totalRetailers > 0) {
      const conversion = totalOrdering / totalRetailers;
      if (conversion > bestConversion) {
        bestConversion = conversion;
        bestCampaign = campaign;
      }
    }
  }

  // best-ever campaign suggestion
  if (bestCampaign && bestConversion > 0.5) {
    const pct = Math.round(bestConversion * 100);
    suggestions.push({
      type: "campaign_performance",
      title: `${bestCampaign.productName} campaign: ${pct}% conversion -- your best ever. Run similar for other products?`,
      description: `This campaign had the highest conversion rate. Consider replicating the approach.`,
      actionType: "view_campaign",
      priority: "low",
      actionPayload: { campaignId: bestCampaign.id },
    });
  }

  return suggestions;
}

// Compare poster variants across campaigns for the same product
export async function analyzePosterPerformance(
  distributorId: string
): Promise<SuggestionInput[]> {
  const suggestions: SuggestionInput[] = [];

  const campaigns = await prisma.campaign.findMany({
    where: { distributorId, status: "sent", posterUrl: { not: null } },
  });

  // group campaigns by product name
  const byProduct: Record<string, typeof campaigns> = {};
  for (const campaign of campaigns) {
    if (!byProduct[campaign.productName]) {
      byProduct[campaign.productName] = [];
    }
    byProduct[campaign.productName].push(campaign);
  }

  for (const [productName, productCampaigns] of Object.entries(byProduct)) {
    // need at least 2 campaigns with different poster URLs
    const uniquePosters = new Set(
      productCampaigns.map((c) => c.posterUrl).filter(Boolean)
    );
    if (uniquePosters.size < 2) continue;

    // count orders for each campaign
    const campaignOrders: { campaign: (typeof campaigns)[0]; orders: number }[] =
      [];

    for (const campaign of productCampaigns) {
      if (!campaign.sentAt) continue;

      const orderCount = await prisma.salesTransaction.count({
        where: {
          date: { gte: campaign.sentAt },
          retailer: {
            zone: { distributorId },
          },
        },
      });

      campaignOrders.push({ campaign, orders: orderCount });
    }

    if (campaignOrders.length < 2) continue;

    campaignOrders.sort((a, b) => b.orders - a.orders);
    const best = campaignOrders[0];
    const worst = campaignOrders[campaignOrders.length - 1];

    if (worst.orders > 0 && best.orders >= worst.orders * 2) {
      const ratio = Math.round(best.orders / worst.orders);
      suggestions.push({
        type: "campaign_performance",
        title: `Best poster got ${ratio}x more orders than other variants for ${productName}. Use this style going forward?`,
        description: `Campaign with poster variant had ${best.orders} orders vs ${worst.orders} for the other variant.`,
        actionType: "view_campaign",
        priority: "low",
        actionPayload: { campaignId: best.campaign.id },
      });
    }
  }

  return suggestions;
}
