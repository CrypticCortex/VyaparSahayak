// DEPRECATED: Tool definitions and execution have moved to src/lib/strands/tools.ts.
// This file is retained for demo mode fallback only.
// src/lib/agent-tools.ts

import { prisma } from "@/lib/db";
import {
  getCachedDistributor,
  getCachedDashboardData,
  getCachedAlerts,
  getCachedProducts,
  getCachedNetworkData,
  getCachedAlert,
  getCachedCampaign,
} from "@/lib/cache";
import { extractFeatures } from "@/lib/ml/features";
import { scoreDeadStock } from "@/lib/ml/scoring";
import { generateRecommendation } from "@/lib/ml/recommendations";
import { invalidateAfterDetection, invalidateAfterRecommend } from "@/lib/cache";

// Tool definitions for Bedrock Converse API
export const TOOL_DEFINITIONS = [
  {
    toolSpec: {
      name: "get_dashboard_summary",
      description:
        "Get a high-level dashboard summary: dead stock value, number of at-risk SKUs, active campaigns, pending recommendations, and zone count.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
  {
    toolSpec: {
      name: "scan_inventory",
      description:
        "Run dead stock detection on the distributor's inventory. Analyzes all products, scores them for risk, and creates alerts for at-risk items. Use when the user wants to scan or refresh their inventory status.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
  {
    toolSpec: {
      name: "get_alerts",
      description:
        "Get all current dead stock alerts with product names, risk levels, stock values, and days since last sale. Returns a list of at-risk items.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
  {
    toolSpec: {
      name: "get_alert_detail",
      description:
        "Get detailed information about a specific dead stock alert including the product info, risk metrics, and ML recommendation.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            alert_id: { type: "string", description: "The alert ID to look up" },
          },
          required: ["alert_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "generate_recommendation",
      description:
        "Generate an AI recommendation and WhatsApp campaign for a specific dead stock alert. This creates a campaign with poster and message. Use when the user wants to take action on a specific alert.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            alert_id: {
              type: "string",
              description: "The alert ID to generate a recommendation for",
            },
          },
          required: ["alert_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "get_campaigns",
      description:
        "List all campaigns with their status (draft/sent), product name, and creation date.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
  {
    toolSpec: {
      name: "get_campaign_detail",
      description:
        "Get detailed info about a specific campaign including poster URL, WhatsApp message, offer details, and status.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            campaign_id: { type: "string", description: "The campaign ID" },
          },
          required: ["campaign_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "send_campaign",
      description:
        "Send a campaign to retailer WhatsApp groups. Picks the right groups based on target zones or sends to all. Updates campaign status to 'sent' and returns delivery summary with group names and member counts.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            campaign_id: { type: "string", description: "The campaign ID to send" },
            zone_codes: {
              type: "array",
              items: { type: "string" },
              description: "Optional: specific zone codes to target (e.g. ['TN-URB', 'TN-TWN']). If omitted, sends to all zone groups.",
            },
          },
          required: ["campaign_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "get_whatsapp_groups",
      description:
        "List all pre-configured WhatsApp groups/communities available for sending campaigns. Shows group names, types (zone_retailers, broadcast, segment), member counts.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
  {
    toolSpec: {
      name: "auto_handle_dead_stock",
      description:
        "Full automated flow: scans inventory for dead stock, picks the top N highest-risk items, generates recommendations and campaigns for each, and optionally sends them to WhatsApp groups. Use when the user wants you to handle everything end-to-end.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            max_items: {
              type: "number",
              description: "Max number of top-risk items to process (default 3)",
            },
            auto_send: {
              type: "boolean",
              description: "If true, automatically send campaigns after creating them. If false (default), leave as drafts for user review.",
            },
          },
          required: [],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "get_network_overview",
      description:
        "Get retailer network overview: zones, retailer counts, dead stock value per zone, and high-risk counts.",
      inputSchema: { json: { type: "object", properties: {}, required: [] } },
    },
  },
];


// Tool execution
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "get_dashboard_summary":
      return getDashboardSummary();
    case "scan_inventory":
      return scanInventory();
    case "get_alerts":
      return getAlerts();
    case "get_alert_detail":
      return getAlertDetail(input.alert_id as string);
    case "generate_recommendation":
      return generateRecommendationForAlert(input.alert_id as string);
    case "get_campaigns":
      return getCampaigns();
    case "get_campaign_detail":
      return getCampaignDetail(input.campaign_id as string);
    case "send_campaign":
      return sendCampaign(input.campaign_id as string, input.zone_codes as string[] | undefined);
    case "get_whatsapp_groups":
      return getWhatsAppGroups();
    case "auto_handle_dead_stock":
      return autoHandleDeadStock(
        (input.max_items as number) || 3,
        (input.auto_send as boolean) || false
      );
    case "get_network_overview":
      return getNetworkOverview();
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}


async function getDashboardSummary() {
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found. Run seed first." };

  const { alerts, campaigns, zones, recommendations } =
    await getCachedDashboardData(distributor.id);

  const deadStockValue = alerts.reduce((s, a) => s + a.stockValue, 0);
  const highRisk = alerts.filter((a) => a.riskLevel === "high").length;
  const pendingRecs = recommendations.filter((r) => r.status === "pending").length;
  const activeCampaigns = campaigns.filter(
    (c) => c.status === "draft" || c.status === "sent"
  ).length;

  return {
    distributorName: distributor.name,
    ownerName: distributor.ownerName,
    deadStockValue: Math.round(deadStockValue),
    deadStockValueFormatted: formatVal(deadStockValue),
    atRiskSkus: alerts.length,
    highRiskSkus: highRisk,
    pendingRecommendations: pendingRecs,
    activeCampaigns,
    totalZones: zones.length,
  };
}


async function scanInventory() {
  const distributor = await prisma.distributor.findFirst();
  if (!distributor) return { error: "No distributor found. Run seed first." };

  await prisma.deadStockAlert.deleteMany({ where: { distributorId: distributor.id } });

  const features = await extractFeatures(distributor.id);
  const scored = scoreDeadStock(features);
  const atRisk = scored.filter((s) => s.riskLevel !== "healthy");

  for (const sku of atRisk) {
    const rec = generateRecommendation(sku, scored);
    await prisma.deadStockAlert.create({
      data: {
        distributorId: distributor.id,
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
  }

  invalidateAfterDetection();

  const totalDeadStockValue = atRisk.reduce((s, a) => s + a.currentStockValue, 0);
  return {
    success: true,
    totalItemsScanned: scored.length,
    atRiskItems: atRisk.length,
    highRisk: atRisk.filter((a) => a.riskLevel === "high").length,
    mediumRisk: atRisk.filter((a) => a.riskLevel === "medium").length,
    totalDeadStockValue: Math.round(totalDeadStockValue),
    totalDeadStockValueFormatted: formatVal(totalDeadStockValue),
  };
}


async function getAlerts() {
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found." };

  const alerts = await getCachedAlerts(distributor.id);
  const productIds = [...new Set(alerts.map((a) => a.productId))];
  const products = await getCachedProducts(productIds);
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return alerts.map((a) => ({
    id: a.id,
    productName: productMap[a.productId] || "Unknown",
    riskLevel: a.riskLevel,
    stockValue: Math.round(a.stockValue),
    stockValueFormatted: formatVal(a.stockValue),
    daysSinceLastSale: a.daysSinceLastSale,
    daysToExpiry: a.daysToExpiry,
    recommendationType: a.recommendationType,
  }));
}


async function getAlertDetail(alertId: string) {
  const alert = await getCachedAlert(alertId);
  if (!alert) return { error: "Alert not found" };

  const product = await prisma.product.findUnique({ where: { id: alert.productId } });
  const rec = alert.recommendationJson ? JSON.parse(alert.recommendationJson) : null;

  return {
    id: alert.id,
    productName: product?.name || "Unknown",
    productBrand: product?.brand || "",
    productCategory: product?.category || "",
    riskLevel: alert.riskLevel,
    score: alert.score,
    stockValue: Math.round(alert.stockValue),
    stockValueFormatted: formatVal(alert.stockValue),
    daysSinceLastSale: alert.daysSinceLastSale,
    daysToExpiry: alert.daysToExpiry,
    weeksOfCover: alert.weeksOfCover,
    zoneCode: alert.zoneCode,
    status: alert.status,
    recommendation: rec,
  };
}


async function generateRecommendationForAlert(alertId: string) {
  // Call the recommend API internally
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/recommend/${alertId}`, { method: "POST" });
  const data = await res.json();

  if (!res.ok) return { error: data.error || "Failed to generate recommendation" };

  return {
    success: true,
    campaignId: data.campaignId,
    recommendationType: data.ai?.type || data.recommendation?.type,
    headline: data.ai?.headline,
    message: "Recommendation and campaign created. The campaign includes a WhatsApp message and poster.",
  };
}


async function getCampaigns() {
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found." };

  const campaigns = await prisma.campaign.findMany({
    where: { distributorId: distributor.id },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((c) => ({
    id: c.id,
    productName: c.productName,
    status: c.status,
    hasPosters: !!(c.posterUrl || c.posterUrlAlt),
    sentAt: c.sentAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
  }));
}


async function getCampaignDetail(campaignId: string) {
  const campaign = await getCachedCampaign(campaignId);
  if (!campaign) return { error: "Campaign not found" };

  return {
    id: campaign.id,
    productName: campaign.productName,
    status: campaign.status,
    posterUrl: campaign.posterUrl,
    posterUrlAlt: campaign.posterUrlAlt,
    whatsappMessage: campaign.whatsappMessage,
    offerHeadline: campaign.offerHeadline,
    sentAt: campaign.sentAt?.toISOString() || null,
    createdAt: campaign.createdAt.toISOString(),
  };
}


async function sendCampaign(campaignId: string, zoneCodes?: string[]) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "Campaign not found" };

  if (campaign.status === "sent") {
    return { message: "Campaign was already sent.", sentAt: campaign.sentAt?.toISOString() };
  }

  // Find WhatsApp groups to send to
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found." };

  let groups = await prisma.whatsAppGroup.findMany({
    where: { distributorId: distributor.id },
  });

  // Filter to specific zones if requested
  if (zoneCodes && zoneCodes.length > 0) {
    const zones = await prisma.zone.findMany({
      where: { distributorId: distributor.id, code: { in: zoneCodes } },
      select: { id: true, code: true },
    });
    const zoneIds = new Set(zones.map((z) => z.id));
    groups = groups.filter((g) => g.zoneId && zoneIds.has(g.zoneId));
  } else {
    // Send to all zone groups (not segment/broadcast unless explicitly chosen)
    groups = groups.filter((g) => g.type === "zone_retailers");
  }

  const totalRecipients = groups.reduce((s, g) => s + g.memberCount, 0);

  // Build WhatsApp deep links for each group
  const deliveries = groups.map((g) => {
    const encodedMsg = encodeURIComponent(campaign.whatsappMessage || `Special offer on ${campaign.productName}!`);
    return {
      groupName: g.name,
      memberCount: g.memberCount,
      inviteLink: g.inviteLink,
      deepLink: `https://wa.me/?text=${encodedMsg}`,
      status: "delivered",
    };
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "sent",
      sentAt: new Date(),
      targetGroups: JSON.stringify(groups.map((g) => g.name)),
    },
  });

  invalidateAfterRecommend(campaignId);

  return {
    success: true,
    productName: campaign.productName,
    totalGroupsSent: groups.length,
    totalRecipients,
    deliveries,
    sentAt: new Date().toISOString(),
    message: `Campaign sent to ${groups.length} WhatsApp groups reaching ${totalRecipients} retailers.`,
  };
}


async function getWhatsAppGroups() {
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found." };

  const groups = await prisma.whatsAppGroup.findMany({
    where: { distributorId: distributor.id },
    orderBy: { memberCount: "desc" },
  });

  // Resolve zone names
  const zoneIds = groups.map((g) => g.zoneId).filter(Boolean) as string[];
  const zones = zoneIds.length > 0
    ? await prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true, code: true } })
    : [];
  const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    memberCount: g.memberCount,
    zoneName: g.zoneId ? zoneMap[g.zoneId]?.name || null : null,
    zoneCode: g.zoneId ? zoneMap[g.zoneId]?.code || null : null,
    inviteLink: g.inviteLink,
  }));
}


async function autoHandleDeadStock(maxItems: number, autoSend: boolean) {
  // Step 1: Scan inventory
  const scanResult = await scanInventory() as any;
  if (scanResult.error) return scanResult;

  // Step 2: Get top alerts
  const alerts = (await getAlerts()) as any[];
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return { ...scanResult, message: "Scan complete but no at-risk items found." };
  }

  // Pick top N by risk (already sorted by score desc)
  const topAlerts = alerts.slice(0, maxItems);
  const actions: any[] = [];

  // Step 3: Generate recommendations for each
  for (const alert of topAlerts) {
    const recResult = await generateRecommendationForAlert(alert.id) as any;
    const action: any = {
      productName: alert.productName,
      riskLevel: alert.riskLevel,
      stockValue: alert.stockValueFormatted,
      recommendationCreated: !recResult.error,
      campaignId: recResult.campaignId || null,
    };

    // Step 4: Optionally send
    if (autoSend && recResult.campaignId) {
      const sendResult = await sendCampaign(recResult.campaignId) as any;
      action.sent = sendResult.success || false;
      action.recipientCount = sendResult.totalRecipients || 0;
      action.groupsSent = sendResult.totalGroupsSent || 0;
    }

    actions.push(action);
  }

  const campaignsCreated = actions.filter((a) => a.recommendationCreated).length;
  const campaignsSent = actions.filter((a) => a.sent).length;

  return {
    success: true,
    scan: {
      totalScanned: scanResult.totalItemsScanned,
      atRiskItems: scanResult.atRiskItems,
      totalDeadStockValue: scanResult.totalDeadStockValueFormatted,
    },
    processed: actions,
    summary: {
      itemsProcessed: topAlerts.length,
      campaignsCreated,
      campaignsSent,
      message: autoSend
        ? `Processed ${topAlerts.length} items, created ${campaignsCreated} campaigns, sent ${campaignsSent} to WhatsApp groups.`
        : `Processed ${topAlerts.length} items and created ${campaignsCreated} campaigns as drafts. Say "send" to dispatch them.`,
    },
  };
}


async function getNetworkOverview() {
  const distributor = await getCachedDistributor();
  if (!distributor) return { error: "No distributor found." };

  const { zones, alerts } = await getCachedNetworkData(distributor.id);

  const zoneStats = zones.map((z) => {
    const zoneAlerts = alerts.filter((a) => a.zoneCode === z.code);
    const deadStockValue = zoneAlerts.reduce((s, a) => s + a.stockValue, 0);
    const highRisk = zoneAlerts.filter((a) => a.riskLevel === "high").length;
    return {
      name: z.name,
      code: z.code,
      retailerCount: z._count.retailers,
      deadStockValue: Math.round(deadStockValue),
      deadStockValueFormatted: formatVal(deadStockValue),
      highRiskAlerts: highRisk,
      totalAlerts: zoneAlerts.length,
    };
  });

  return {
    totalZones: zones.length,
    totalRetailers: zoneStats.reduce((s, z) => s + z.retailerCount, 0),
    zones: zoneStats,
  };
}


function formatVal(v: number) {
  if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `Rs.${(v / 1000).toFixed(1)}K`;
  return `Rs.${Math.round(v)}`;
}
