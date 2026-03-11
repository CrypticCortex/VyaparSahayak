export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { getCachedDistributor, getCachedDashboardData, getCachedProducts } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { MetricsRow } from "@/components/dashboard/metrics-row";
import { InventoryTable } from "@/components/dashboard/inventory-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AiInsight } from "@/components/dashboard/ai-insight";
import { AutoSeed } from "@/components/dashboard/auto-seed";
import { ClientIntroOverlay } from "@/components/dashboard/client-intro-overlay";
import { SuggestionList } from "@/components/dashboard/suggestion-list";
import { generateDashboardInsight } from "@/lib/ml/insights";

export default async function DemoPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return <AutoSeed />;
  }

  const { alerts, campaigns, zones, recommendations } =
    await getCachedDashboardData(distributor.id);

  const deadStockValue = alerts.reduce((sum, a) => sum + a.stockValue, 0);
  const deadStockSkuCount = alerts.length;

  const approvedCampaigns = campaigns.filter((c) => c.status === "sent");
  const clearedValue = approvedCampaigns.length * 45000;

  const activeCampaignCount = campaigns.filter(
    (c) => c.status === "draft" || c.status === "sent"
  ).length;

  const trendData = [
    { week: "Week 1", value: Math.round(deadStockValue * 1.3) },
    { week: "Week 2", value: Math.round(deadStockValue * 1.15) },
    { week: "Week 3", value: Math.round(deadStockValue * 1.05) },
    { week: "Week 4", value: Math.round(deadStockValue) },
  ];

  const pendingOrders = await prisma.order.findMany({
    where: { distributorId: distributor.id, status: "pending" },
    select: { totalAmount: true },
  });
  const pendingOrderCount = pendingOrders.length;
  const pendingOrderValue = pendingOrders.reduce((s, o) => s + o.totalAmount, 0);

  const insight = generateDashboardInsight(alerts);

  // Fetch product names for alert rows
  const productIds = [...new Set(alerts.map((a) => a.productId))];
  const products = await getCachedProducts(productIds);
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  // Find recommendation IDs for alerts
  const alertIds = alerts.map((a) => a.id);
  const recs = recommendations.filter((r) => alertIds.includes(r.alertId));
  const recMap = Object.fromEntries(recs.map((r) => [r.alertId, r.id]));

  // Build table rows
  const tableRows = alerts.map((a) => ({
    id: a.id,
    productName: productMap[a.productId] || "Unknown Product",
    zoneName: "",
    zoneCode: a.zoneCode,
    stockQty: 0,
    stockValue: a.stockValue,
    daysIdle: a.daysSinceLastSale,
    expiryDays: a.daysToExpiry ?? null,
    riskLevel: a.riskLevel,
    recommendationId: recMap[a.id] ?? null,
  }));

  return (
    <>
    <ClientIntroOverlay />
    <div className="p-4 lg:p-6 space-y-6">
      {/* Metrics row */}
      <MetricsRow
        deadStockValue={deadStockValue}
        deadStockSkuCount={deadStockSkuCount}
        clearedValue={clearedValue}
        activeCampaigns={activeCampaignCount}
        pendingOrders={pendingOrderCount}
        pendingOrderValue={pendingOrderValue}
      />

      {/* Main content: table + chart on left, widgets on right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: table + chart */}
        <div className="xl:col-span-2 space-y-6">
          <InventoryTable alerts={tableRows} />
          <TrendChart data={trendData} />
        </div>

        {/* Right sidebar widgets */}
        <div className="space-y-6">
          <AiInsight
            message={insight.message}
            metric={insight.metric}
            supporting={insight.supporting}
            linkHref={insight.alertId ? `/demo/recommendations/${insight.alertId}` : "/demo/alerts"}
          />
          <SuggestionList maxVisible={3} />
        </div>
      </div>
    </div>
    </>
  );
}
