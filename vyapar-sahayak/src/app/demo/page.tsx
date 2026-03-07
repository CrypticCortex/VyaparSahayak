import { getCachedDistributor, getCachedDashboardData } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { HeroCards } from "@/components/dashboard/hero-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { AiInsight } from "@/components/dashboard/ai-insight";
import { AutoSeed } from "@/components/dashboard/auto-seed";
import { GuidedTour } from "@/components/dashboard/guided-tour";
import { SuggestionList } from "@/components/dashboard/suggestion-list";
import { generateDashboardInsight } from "@/lib/ml/insights";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DemoPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return <AutoSeed />;
  }

  const { alerts, campaigns, zones, recommendations } =
    await getCachedDashboardData(distributor.id);

  const deadStockValue = alerts.reduce((sum, a) => sum + a.stockValue, 0);
  const deadStockSkuCount = alerts.length;

  // Approximate cleared value from approved campaigns
  const approvedCampaigns = campaigns.filter((c) => c.status === "sent");
  const clearedValue = approvedCampaigns.length * 45000; // rough estimate per campaign

  const pendingCount = recommendations.filter((r) => r.status === "pending").length;
  const activeCampaignCount = campaigns.filter(
    (c) => c.status === "draft" || c.status === "sent"
  ).length;

  // Build 4-week trend data (simulated from current dead stock value)
  const trendData = [
    { week: "Week 1", value: Math.round(deadStockValue * 1.3) },
    { week: "Week 2", value: Math.round(deadStockValue * 1.15) },
    { week: "Week 3", value: Math.round(deadStockValue * 1.05) },
    { week: "Week 4", value: Math.round(deadStockValue) },
  ];

  // Pending orders data
  const pendingOrders = await prisma.order.findMany({
    where: { distributorId: distributor.id, status: "pending" },
    select: { totalAmount: true },
  });
  const pendingOrderCount = pendingOrders.length;
  const pendingOrderValue = pendingOrders.reduce((s, o) => s + o.totalAmount, 0);

  // Generate real AI insight from ML analysis
  const insight = generateDashboardInsight(alerts);

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Greeting */}
      <div className="px-4">
        <p className="text-sm text-[#8892A8]">{getGreeting()},</p>
        <h1 className="text-xl font-bold text-white">
          {distributor.ownerName}
        </h1>
      </div>

      {/* Hero cards */}
      <div data-tour="hero-cards">
        <HeroCards
          deadStockValue={deadStockValue}
          deadStockSkuCount={deadStockSkuCount}
          clearedValue={clearedValue}
          pendingOrders={pendingOrderCount}
          pendingOrderValue={pendingOrderValue}
        />
      </div>

      {/* Quick actions */}
      <div data-tour="quick-actions">
        <QuickActions
          alertCount={deadStockSkuCount}
          pendingCount={pendingCount}
          campaignCount={activeCampaignCount}
          zoneCount={zones.length}
        />
      </div>

      {/* Agent Suggestions */}
      <SuggestionList maxVisible={3} />

      {/* Trend chart */}
      <div data-tour="trend-chart">
        <TrendChart data={trendData} />
      </div>

      {/* AI Insight */}
      <div data-tour="ai-insight">
        <AiInsight
          message={insight.message}
          metric={insight.metric}
          supporting={insight.supporting}
          linkHref={insight.alertId ? `/demo/recommendations/${insight.alertId}` : "/demo/alerts"}
        />
      </div>

      {/* Guided tour for first-time users */}
      <GuidedTour />
    </div>
  );
}
