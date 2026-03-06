import { getCachedDistributor, getCachedDashboardData } from "@/lib/cache";
import { SuggestionList } from "@/components/dashboard/suggestion-list";
import Link from "next/link";

export default async function DemoPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-[#757575]">
          No data found. Run the seed script first.
        </p>
      </div>
    );
  }

  const data = await getCachedDashboardData(distributor.id);

  const highRiskAlerts = data.alerts.filter((a) => a.riskLevel === "high");
  const activeCampaigns = data.campaigns.filter((c) => c.status === "sent");

  return (
    <div className="flex flex-col gap-4 py-4 px-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#1A1A1A]">
          {distributor.name}
        </h1>
        <p className="text-xs text-[#9E9E9E]">
          {distributor.city}, {distributor.state}
        </p>
      </div>

      {/* Agent Suggestions */}
      <SuggestionList />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/demo/alerts"
          className="rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm"
        >
          <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">
            High-Risk Items
          </p>
          <p className="text-2xl font-bold text-[#C62828]">
            {highRiskAlerts.length}
          </p>
        </Link>
        <Link
          href="/demo/campaigns"
          className="rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm"
        >
          <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">
            Active Campaigns
          </p>
          <p className="text-2xl font-bold text-[#1A237E]">
            {activeCampaigns.length}
          </p>
        </Link>
        <div className="rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
          <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">
            Zones
          </p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {data.zones.length}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
          <p className="text-[10px] text-[#9E9E9E] uppercase tracking-wide">
            Total Alerts
          </p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {data.alerts.length}
          </p>
        </div>
      </div>
    </div>
  );
}
