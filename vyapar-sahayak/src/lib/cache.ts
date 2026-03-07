import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";

export const CACHE_TAGS = {
  dashboard: "dashboard",
  alerts: "alerts",
  network: "network",
  campaigns: "campaigns",
} as const;

export function campaignTag(id: string) {
  return `campaign-${id}`;
}

// Distributor -- used by all pages
export const getCachedDistributor = unstable_cache(
  () => prisma.distributor.findFirst(),
  ["distributor"],
  { tags: [CACHE_TAGS.dashboard], revalidate: 60 }
);

// Dashboard aggregate data
export const getCachedDashboardData = (distributorId: string) =>
  unstable_cache(
    async () => {
      const [alerts, campaigns, zones, recommendations] = await Promise.all([
        prisma.deadStockAlert.findMany({
          where: { distributorId, status: "open" },
        }),
        prisma.campaign.findMany({ where: { distributorId } }),
        prisma.zone.findMany({ where: { distributorId } }),
        prisma.recommendation.findMany({ where: { status: "pending" } }),
      ]);
      return { alerts, campaigns, zones, recommendations };
    },
    ["dashboard-data", distributorId],
    { tags: [CACHE_TAGS.dashboard], revalidate: 60 }
  )();

// Alerts page -- open alerts sorted by score desc
export const getCachedAlerts = (distributorId: string) =>
  unstable_cache(
    () =>
      prisma.deadStockAlert.findMany({
        where: { distributorId, status: "open" },
        orderBy: { score: "desc" },
      }),
    ["alerts", distributorId],
    { tags: [CACHE_TAGS.alerts, CACHE_TAGS.dashboard], revalidate: 60 }
  )();

// Products by IDs -- for alerts page
export const getCachedProducts = (productIds: string[]) =>
  unstable_cache(
    () =>
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      }),
    ["alert-products", ...productIds.sort()],
    { tags: [CACHE_TAGS.alerts], revalidate: 60 }
  )();

// Network page -- zones with retailer counts + all alerts
export const getCachedNetworkData = (distributorId: string) =>
  unstable_cache(
    async () => {
      const [zones, alerts] = await Promise.all([
        prisma.zone.findMany({
          where: { distributorId },
          include: { _count: { select: { retailers: true } } },
        }),
        prisma.deadStockAlert.findMany({
          where: { distributorId },
          select: { zoneCode: true, stockValue: true, riskLevel: true },
        }),
      ]);
      return { zones, alerts };
    },
    ["network-data", distributorId],
    { tags: [CACHE_TAGS.network, CACHE_TAGS.dashboard], revalidate: 60 }
  )();

// Campaigns list -- all campaigns for distributor
export const getCachedCampaigns = (distributorId: string) =>
  unstable_cache(
    () =>
      prisma.campaign.findMany({
        where: { distributorId },
        orderBy: { createdAt: "desc" },
        include: { recommendation: { select: { id: true, status: true } } },
      }),
    ["campaigns-list", distributorId],
    { tags: [CACHE_TAGS.campaigns, CACHE_TAGS.dashboard], revalidate: 60 }
  )();

// Campaign by ID with recommendation
export const getCachedCampaign = (id: string) =>
  unstable_cache(
    () =>
      prisma.campaign.findUnique({
        where: { id },
        include: { recommendation: true },
      }),
    ["campaign", id],
    { tags: [campaignTag(id), CACHE_TAGS.campaigns], revalidate: 60 }
  )();

// Zones with retailer counts -- for campaign detail
export const getCachedCampaignZones = (distributorId: string) =>
  unstable_cache(
    () =>
      prisma.zone.findMany({
        where: { distributorId },
        include: { _count: { select: { retailers: true } } },
      }),
    ["campaign-zones", distributorId],
    { tags: [CACHE_TAGS.network], revalidate: 60 }
  )();

// Alert by ID -- for recommendation page
export const getCachedAlert = (id: string) =>
  unstable_cache(
    () => prisma.deadStockAlert.findUnique({ where: { id } }),
    ["alert", id],
    { tags: [CACHE_TAGS.alerts], revalidate: 60 }
  )();

// Product by ID -- for recommendation page
export const getCachedProduct = (id: string) =>
  unstable_cache(
    () =>
      prisma.product.findUnique({
        where: { id },
        select: { name: true },
      }),
    ["product", id],
    { tags: [CACHE_TAGS.alerts], revalidate: 60 }
  )();

// Zones basic -- for recommendation page
export const getCachedZones = (distributorId: string) =>
  unstable_cache(
    () =>
      prisma.zone.findMany({
        where: { distributorId },
        select: { name: true, code: true },
      }),
    ["zones-basic", distributorId],
    { tags: [CACHE_TAGS.network], revalidate: 60 }
  )();

// Invalidation helpers -- Next.js 16 revalidateTag requires a second "profile" arg
export function invalidateDashboard() {
  revalidateTag(CACHE_TAGS.dashboard, "max");
}

export function invalidateAfterDetection() {
  revalidateTag(CACHE_TAGS.dashboard, "max");
  revalidateTag(CACHE_TAGS.alerts, "max");
  revalidateTag(CACHE_TAGS.network, "max");
}

export function invalidateAfterRecommend(campaignId?: string) {
  revalidateTag(CACHE_TAGS.dashboard, "max");
  revalidateTag(CACHE_TAGS.alerts, "max");
  revalidateTag(CACHE_TAGS.campaigns, "max");
  if (campaignId) revalidateTag(campaignTag(campaignId), "max");
}

export function invalidateCampaign(id: string) {
  revalidateTag(campaignTag(id), "max");
  revalidateTag(CACHE_TAGS.campaigns, "max");
}
