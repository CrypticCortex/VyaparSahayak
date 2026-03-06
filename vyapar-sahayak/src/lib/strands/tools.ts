// Strands Agent tool definitions -- all 19 tools with Zod schemas

import { tool } from "@strands-agents/sdk";
import type { JSONValue } from "@strands-agents/sdk";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCachedDistributor,
  getCachedDashboardData,
  getCachedAlerts,
  getCachedProducts,
  getCachedNetworkData,
  getCachedAlert,
  getCachedCampaign,
  invalidateAfterDetection,
  invalidateAfterRecommend,
} from "@/lib/cache";
import { extractFeatures } from "@/lib/ml/features";
import { scoreDeadStock } from "@/lib/ml/scoring";
import { generateRecommendation } from "@/lib/ml/recommendations";


// Helper to return typed error objects (avoids undefined-in-union JSONValue issues)
function err(message: string): JSONValue {
  return { error: message };
}


function formatVal(v: number) {
  if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `Rs.${(v / 1000).toFixed(1)}K`;
  return `Rs.${Math.round(v)}`;
}


// --- Existing 11 tools (rewritten with Zod) ---

export const getDashboardSummary = tool({
  name: "get_dashboard_summary",
  description: "Get a high-level dashboard summary: dead stock value, at-risk SKUs, active campaigns, pending recommendations, and zone count.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found. Run seed first.");

    const { alerts, campaigns, zones, recommendations } = await getCachedDashboardData(distributor.id);
    const deadStockValue = alerts.reduce((s, a) => s + a.stockValue, 0);
    const highRisk = alerts.filter((a) => a.riskLevel === "high").length;
    const pendingRecs = recommendations.filter((r) => r.status === "pending").length;
    const activeCampaigns = campaigns.filter((c) => c.status === "draft" || c.status === "sent").length;

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
  },
});


export const scanInventory = tool({
  name: "scan_inventory",
  description: "Run dead stock detection on the distributor's inventory. Analyzes all products, scores them for risk, and creates alerts.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found. Run seed first.");

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
  },
});


export const getAlerts = tool({
  name: "get_alerts",
  description: "Get all current dead stock alerts with product names, risk levels, stock values, and days since last sale.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found.");

    const alerts = await getCachedAlerts(distributor.id);
    const productIds = [...new Set(alerts.map((a) => a.productId))];
    const products = await getCachedProducts(productIds);
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    return {
      items: alerts.map((a) => ({
        id: a.id,
        productName: productMap[a.productId] || "Unknown",
        riskLevel: a.riskLevel,
        stockValue: Math.round(a.stockValue),
        stockValueFormatted: formatVal(a.stockValue),
        daysSinceLastSale: a.daysSinceLastSale,
        daysToExpiry: a.daysToExpiry,
        recommendationType: a.recommendationType,
      })),
    };
  },
});


export const getAlertDetail = tool({
  name: "get_alert_detail",
  description: "Get detailed information about a specific dead stock alert including product info, risk metrics, and ML recommendation.",
  inputSchema: z.object({
    alert_id: z.string().describe("The alert ID to look up"),
  }),
  callback: async (input) => {
    const alert = await getCachedAlert(input.alert_id);
    if (!alert) return err("Alert not found");

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
  },
});


export const generateRecommendationTool = tool({
  name: "generate_recommendation",
  description: "Generate an AI recommendation and WhatsApp campaign for a dead stock alert. Creates a campaign with poster and message.",
  inputSchema: z.object({
    alert_id: z.string().describe("The alert ID to generate a recommendation for"),
  }),
  callback: async (input) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
    const res = await fetch(`${baseUrl}/api/recommend/${input.alert_id}`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) return err(data.error || "Failed to generate recommendation");

    return {
      success: true,
      campaignId: data.campaignId,
      recommendationType: data.ai?.type || data.recommendation?.type || null,
      headline: data.ai?.headline || null,
      message: "Recommendation and campaign created with WhatsApp message and poster.",
    };
  },
});


export const getCampaigns = tool({
  name: "get_campaigns",
  description: "List all campaigns with their status (draft/sent), product name, and creation date.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found.");

    const campaigns = await prisma.campaign.findMany({
      where: { distributorId: distributor.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: campaigns.map((c) => ({
        id: c.id,
        productName: c.productName,
        status: c.status,
        hasPosters: !!(c.posterUrl || c.posterUrlAlt),
        sentAt: c.sentAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  },
});


export const getCampaignDetail = tool({
  name: "get_campaign_detail",
  description: "Get detailed info about a specific campaign including poster URL, WhatsApp message, offer details, and status.",
  inputSchema: z.object({
    campaign_id: z.string().describe("The campaign ID"),
  }),
  callback: async (input) => {
    const campaign = await getCachedCampaign(input.campaign_id);
    if (!campaign) return err("Campaign not found");

    return {
      id: campaign.id,
      productName: campaign.productName,
      status: campaign.status,
      posterUrl: campaign.posterUrl,
      posterUrlAlt: campaign.posterUrlAlt,
      whatsappMessage: campaign.whatsappMessage,
      offerHeadline: campaign.offerHeadline,
      orderLink: campaign.orderLink,
      sentAt: campaign.sentAt?.toISOString() || null,
      createdAt: campaign.createdAt.toISOString(),
    };
  },
});


export const sendCampaignTool = tool({
  name: "send_campaign",
  description: "Send a campaign to retailer WhatsApp groups. This is a mutating action -- present the plan to the user before executing.",
  inputSchema: z.object({
    campaign_id: z.string().describe("The campaign ID to send"),
    zone_codes: z.array(z.string()).optional().describe("Optional zone codes to target"),
  }),
  callback: async (input) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: input.campaign_id } });
    if (!campaign) return err("Campaign not found");

    if (campaign.status === "sent") {
      return { message: "Campaign was already sent.", sentAt: campaign.sentAt?.toISOString() || null };
    }

    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found.");

    let groups = await prisma.whatsAppGroup.findMany({
      where: { distributorId: distributor.id },
    });

    if (input.zone_codes && input.zone_codes.length > 0) {
      const zones = await prisma.zone.findMany({
        where: { distributorId: distributor.id, code: { in: input.zone_codes } },
        select: { id: true },
      });
      const zoneIds = new Set(zones.map((z) => z.id));
      groups = groups.filter((g) => g.zoneId && zoneIds.has(g.zoneId));
    } else {
      groups = groups.filter((g) => g.type === "zone_retailers");
    }

    const totalRecipients = groups.reduce((s, g) => s + g.memberCount, 0);

    const deliveries = groups.map((g) => ({
      groupName: g.name,
      memberCount: g.memberCount,
      status: "delivered",
    }));

    await prisma.campaign.update({
      where: { id: input.campaign_id },
      data: {
        status: "sent",
        sentAt: new Date(),
        targetGroups: JSON.stringify(groups.map((g) => g.name)),
      },
    });

    invalidateAfterRecommend(input.campaign_id);

    return {
      success: true,
      productName: campaign.productName,
      totalGroupsSent: groups.length,
      totalRecipients,
      deliveries,
      sentAt: new Date().toISOString(),
      message: `Campaign sent to ${groups.length} WhatsApp groups reaching ${totalRecipients} retailers.`,
    };
  },
});


export const getWhatsAppGroups = tool({
  name: "get_whatsapp_groups",
  description: "List all WhatsApp groups/communities available for sending campaigns.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found.");

    const groups = await prisma.whatsAppGroup.findMany({
      where: { distributorId: distributor.id },
      orderBy: { memberCount: "desc" },
    });

    const zoneIds = groups.map((g) => g.zoneId).filter(Boolean) as string[];
    const zones = zoneIds.length > 0
      ? await prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true, code: true } })
      : [];
    const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));

    return {
      items: groups.map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        memberCount: g.memberCount,
        zoneName: g.zoneId ? zoneMap[g.zoneId]?.name || null : null,
        zoneCode: g.zoneId ? zoneMap[g.zoneId]?.code || null : null,
        inviteLink: g.inviteLink,
      })),
    };
  },
});


export const autoHandleDeadStock = tool({
  name: "auto_handle_dead_stock",
  description: "Full automated flow: scan inventory, pick top N highest-risk items, generate recommendations and campaigns. Use when the user wants end-to-end handling.",
  inputSchema: z.object({
    max_items: z.number().optional().describe("Max number of top-risk items to process (default 3)"),
    auto_send: z.boolean().optional().describe("If true, auto-send campaigns after creating them"),
  }),
  callback: async (input) => {
    const maxItems = input.max_items ?? 3;
    const autoSend = input.auto_send ?? false;

    // Scan
    const scanResult = await scanInventory.invoke({});
    if ((scanResult as any).error) return scanResult;

    // Get alerts
    const alertsResult = await getAlerts.invoke({});
    const alerts = (alertsResult as any).items;
    if (!alerts || alerts.length === 0) {
      return { ...(scanResult as Record<string, JSONValue>), message: "Scan complete but no at-risk items found." };
    }

    const topAlerts = alerts.slice(0, maxItems);
    const actions: any[] = [];

    for (const alert of topAlerts) {
      const recResult = await generateRecommendationTool.invoke({ alert_id: alert.id }) as any;
      const action: any = {
        productName: alert.productName,
        riskLevel: alert.riskLevel,
        stockValue: alert.stockValueFormatted,
        recommendationCreated: !recResult.error,
        campaignId: recResult.campaignId || null,
      };

      if (autoSend && recResult.campaignId) {
        const sendResult = await sendCampaignTool.invoke({ campaign_id: recResult.campaignId }) as any;
        action.sent = sendResult.success || false;
        action.recipientCount = sendResult.totalRecipients || 0;
      }

      actions.push(action);
    }

    const campaignsCreated = actions.filter((a) => a.recommendationCreated).length;
    const campaignsSent = actions.filter((a) => a.sent).length;

    return {
      success: true,
      scan: {
        totalScanned: (scanResult as any).totalItemsScanned,
        atRiskItems: (scanResult as any).atRiskItems,
        totalDeadStockValue: (scanResult as any).totalDeadStockValueFormatted,
      },
      processed: actions,
      summary: {
        itemsProcessed: topAlerts.length,
        campaignsCreated,
        campaignsSent,
        message: autoSend
          ? `Processed ${topAlerts.length} items, created ${campaignsCreated} campaigns, sent ${campaignsSent}.`
          : `Processed ${topAlerts.length} items and created ${campaignsCreated} campaigns as drafts.`,
      },
    };
  },
});


export const getNetworkOverview = tool({
  name: "get_network_overview",
  description: "Get retailer network overview: zones, retailer counts, dead stock value per zone.",
  inputSchema: z.object({}),
  callback: async () => {
    const distributor = await getCachedDistributor();
    if (!distributor) return err("No distributor found.");

    const { zones, alerts } = await getCachedNetworkData(distributor.id);

    const zoneStats = zones.map((z) => {
      const zoneAlerts = alerts.filter((a) => a.zoneCode === z.code);
      const deadStockValue = zoneAlerts.reduce((s, a) => s + a.stockValue, 0);
      return {
        name: z.name,
        code: z.code,
        retailerCount: z._count.retailers,
        deadStockValue: Math.round(deadStockValue),
        deadStockValueFormatted: formatVal(deadStockValue),
        highRiskAlerts: zoneAlerts.filter((a) => a.riskLevel === "high").length,
        totalAlerts: zoneAlerts.length,
      };
    });

    return {
      totalZones: zones.length,
      totalRetailers: zoneStats.reduce((s, z) => s + z.retailerCount, 0),
      zones: zoneStats,
    };
  },
});


// --- 7 New tools ---

export const getPendingOrders = tool({
  name: "get_pending_orders",
  description: "Get pending orders grouped by zone with counts and total values.",
  inputSchema: z.object({
    zone_code: z.string().optional().describe("Filter by zone code"),
  }),
  callback: async (input) => {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const where: any = { distributorId: distributor.id, status: "pending" };
    if (input.zone_code) where.zoneCode = input.zone_code;

    const orders = await prisma.order.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by zone
    const groups: Record<string, any[]> = {};
    for (const order of orders) {
      if (!groups[order.zoneCode]) groups[order.zoneCode] = [];
      groups[order.zoneCode].push({
        id: order.id,
        retailerName: order.retailer.name,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        products: order.items.map((i) => `${i.product.name} x${i.quantity}`),
        createdAt: order.createdAt.toISOString(),
      });
    }

    const zones = Object.entries(groups).map(([zoneCode, zoneOrders]) => ({
      zoneCode,
      orderCount: zoneOrders.length,
      totalValue: Math.round(zoneOrders.reduce((s, o) => s + o.totalAmount, 0)),
      orders: zoneOrders,
    }));

    return { totalPending: orders.length, zones };
  },
});


export const confirmOrder = tool({
  name: "confirm_order",
  description: "Confirm a pending order. Updates order status to confirmed.",
  inputSchema: z.object({
    order_id: z.string().describe("The order ID to confirm"),
  }),
  callback: async (input) => {
    const order = await prisma.order.findUnique({
      where: { id: input.order_id },
      include: { retailer: { select: { name: true } } },
    });
    if (!order) return err("Order not found");
    if (order.status !== "pending") return err(`Order is already ${order.status}`);

    await prisma.order.update({
      where: { id: input.order_id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });

    return {
      success: true,
      orderId: order.id,
      retailerName: order.retailer.name,
      totalAmount: order.totalAmount,
      message: `Order from ${order.retailer.name} confirmed (Rs.${Math.round(order.totalAmount)}).`,
    };
  },
});


export const rejectOrder = tool({
  name: "reject_order",
  description: "Reject an order with a reason.",
  inputSchema: z.object({
    order_id: z.string().describe("The order ID to reject"),
    reason: z.string().describe("Reason for rejection"),
  }),
  callback: async (input) => {
    const order = await prisma.order.findUnique({
      where: { id: input.order_id },
      include: { retailer: { select: { name: true } } },
    });
    if (!order) return err("Order not found");

    await prisma.order.update({
      where: { id: input.order_id },
      data: { status: "cancelled", notes: `Rejected: ${input.reason}` },
    });

    return {
      success: true,
      orderId: order.id,
      retailerName: order.retailer.name,
      message: `Order from ${order.retailer.name} rejected: ${input.reason}`,
    };
  },
});


export const suggestDispatchBatch = tool({
  name: "suggest_dispatch_batch",
  description: "Analyze confirmed orders and suggest optimal dispatch groupings by zone.",
  inputSchema: z.object({
    zone_code: z.string().optional().describe("Filter to specific zone"),
  }),
  callback: async (input) => {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const where: any = { distributorId: distributor.id, status: "confirmed" };
    if (input.zone_code) where.zoneCode = input.zone_code;

    const orders = await prisma.order.findMany({
      where,
      include: { retailer: { select: { name: true } } },
    });

    if (orders.length === 0) {
      return { suggestions: [], message: "No confirmed orders available for batching." };
    }

    // Group by zone
    const groups: Record<string, typeof orders> = {};
    for (const order of orders) {
      if (!groups[order.zoneCode]) groups[order.zoneCode] = [];
      groups[order.zoneCode].push(order);
    }

    const suggestions = Object.entries(groups).map(([zoneCode, zoneOrders]) => ({
      zoneCode,
      orderCount: zoneOrders.length,
      totalValue: Math.round(zoneOrders.reduce((s, o) => s + o.totalAmount, 0)),
      orderIds: zoneOrders.map((o) => o.id),
      retailers: zoneOrders.map((o) => o.retailer.name),
    }));

    return { suggestions };
  },
});


export const createDispatchBatch = tool({
  name: "create_dispatch_batch",
  description: "Create a dispatch batch grouping confirmed orders for a zone. Updates orders to dispatched status.",
  inputSchema: z.object({
    zone_code: z.string().describe("Zone code for this batch"),
    order_ids: z.array(z.string()).describe("Order IDs to include in the batch"),
  }),
  callback: async (input) => {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const batch = await prisma.dispatchBatch.create({
      data: {
        distributorId: distributor.id,
        zoneCode: input.zone_code,
        status: "planned",
        plannedDate: new Date(),
        orders: {
          create: input.order_ids.map((orderId) => ({ orderId })),
        },
      },
    });

    // Update orders to dispatched
    await prisma.order.updateMany({
      where: { id: { in: input.order_ids } },
      data: { status: "dispatched", dispatchedAt: new Date() },
    });

    return {
      success: true,
      batchId: batch.id,
      zoneCode: input.zone_code,
      orderCount: input.order_ids.length,
      message: `Dispatch batch created for ${input.zone_code} with ${input.order_ids.length} orders.`,
    };
  },
});


export const checkRetailerActivity = tool({
  name: "check_retailer_activity",
  description: "Flag retailers who haven't ordered recently compared to their usual frequency.",
  inputSchema: z.object({
    inactive_days: z.number().optional().describe("Days of inactivity to flag (default 14)"),
  }),
  callback: async (input) => {
    const inactiveDays = input.inactive_days ?? 14;
    const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const retailers = await prisma.retailer.findMany({
      where: { zone: { distributorId: distributor.id } },
      include: {
        zone: { select: { name: true, code: true } },
        transactions: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
    });

    const flagged = retailers
      .filter((r) => {
        const lastOrder = r.transactions[0]?.date;
        return !lastOrder || lastOrder < cutoff;
      })
      .map((r) => ({
        retailerId: r.id,
        retailerName: r.name,
        zoneName: r.zone.name,
        zoneCode: r.zone.code,
        lastOrderDate: r.transactions[0]?.date?.toISOString() || "never",
        daysSinceLastOrder: r.transactions[0]
          ? Math.floor((Date.now() - r.transactions[0].date.getTime()) / (24 * 60 * 60 * 1000))
          : 999,
      }))
      .sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder)
      .slice(0, 20);

    return {
      flaggedCount: flagged.length,
      inactiveDaysThreshold: inactiveDays,
      retailers: flagged,
    };
  },
});


export const getCampaignPerformance = tool({
  name: "get_campaign_performance",
  description: "Get campaign conversion rates: orders placed vs retailers reached, with per-zone breakdown.",
  inputSchema: z.object({
    campaign_id: z.string().optional().describe("Specific campaign ID, or omit for all sent campaigns"),
  }),
  callback: async (input) => {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const where: any = { distributorId: distributor.id, status: "sent" };
    if (input.campaign_id) where.id = input.campaign_id;

    const campaigns = await prisma.campaign.findMany({
      where,
      include: { orders: { include: { retailer: { select: { name: true } } } } },
    });

    if (campaigns.length === 0) {
      return { campaigns: [], message: "No sent campaigns found." };
    }

    const results = campaigns.map((c) => {
      // Parse target groups to estimate reach
      let totalReached = 0;
      try {
        const groups = JSON.parse(c.targetGroups || "[]");
        totalReached = groups.length * 25; // approximate per group
      } catch {
        totalReached = 50;
      }

      const orderCount = c.orders.length;
      const conversionRate = totalReached > 0 ? ((orderCount / totalReached) * 100).toFixed(1) : "0";

      // Per-zone breakdown
      const zoneOrders: Record<string, number> = {};
      for (const order of c.orders) {
        zoneOrders[order.zoneCode] = (zoneOrders[order.zoneCode] || 0) + 1;
      }

      return {
        campaignId: c.id,
        productName: c.productName,
        totalReached,
        totalOrdered: orderCount,
        conversionRate: `${conversionRate}%`,
        totalOrderValue: Math.round(c.orders.reduce((s, o) => s + o.totalAmount, 0)),
        zoneBreakdown: Object.entries(zoneOrders).map(([zone, count]) => ({ zone, orders: count })),
        sentAt: c.sentAt?.toISOString() || null,
      };
    });

    return { campaigns: results };
  },
});


export const sendCampaignReminder = tool({
  name: "send_campaign_reminder",
  description: "Re-send a campaign to retailers who haven't ordered yet.",
  inputSchema: z.object({
    campaign_id: z.string().describe("Campaign ID to send reminders for"),
  }),
  callback: async (input) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaign_id },
      include: { orders: { select: { retailerId: true } } },
    });
    if (!campaign) return err("Campaign not found");
    if (campaign.status !== "sent") return err("Campaign has not been sent yet. Send it first.");

    const orderedRetailerIds = new Set(campaign.orders.map((o) => o.retailerId));

    // Get all retailers in target zones
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) return err("No distributor found.");

    const allRetailers = await prisma.retailer.findMany({
      where: { zone: { distributorId: distributor.id } },
      select: { id: true, name: true },
    });

    const nonResponders = allRetailers.filter((r) => !orderedRetailerIds.has(r.id));

    return {
      success: true,
      campaignId: campaign.id,
      productName: campaign.productName,
      remindersSent: nonResponders.length,
      alreadyOrdered: orderedRetailerIds.size,
      message: `Reminder sent to ${nonResponders.length} retailers who haven't ordered yet (${orderedRetailerIds.size} already ordered).`,
    };
  },
});


// Export all tools as a single array
export const allTools = [
  getDashboardSummary,
  scanInventory,
  getAlerts,
  getAlertDetail,
  generateRecommendationTool,
  getCampaigns,
  getCampaignDetail,
  sendCampaignTool,
  getWhatsAppGroups,
  autoHandleDeadStock,
  getNetworkOverview,
  getPendingOrders,
  confirmOrder,
  rejectOrder,
  suggestDispatchBatch,
  createDispatchBatch,
  checkRetailerActivity,
  getCampaignPerformance,
  sendCampaignReminder,
];
