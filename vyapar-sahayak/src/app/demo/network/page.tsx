import { getCachedDistributor, getCachedNetworkData } from "@/lib/cache";
import Link from "next/link";

export default async function NetworkPage() {
  const distributor = await getCachedDistributor();
  if (!distributor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[#757575]">No data. Run seed first.</p>
      </div>
    );
  }

  const { zones, alerts } = await getCachedNetworkData(distributor.id);

  const zoneStats = zones.map((z) => {
    const zoneAlerts = alerts.filter((a) => a.zoneCode === z.code);
    const deadStockValue = zoneAlerts.reduce((s, a) => s + a.stockValue, 0);
    const highRisk = zoneAlerts.filter((a) => a.riskLevel === "high").length;
    return { ...z, retailerCount: z._count.retailers, deadStockValue, highRisk, alertCount: zoneAlerts.length };
  });

  const formatVal = (v: number) =>
    v >= 100000 ? `Rs.${(v / 100000).toFixed(1)}L` :
    v >= 1000 ? `Rs.${(v / 1000).toFixed(1)}K` :
    `Rs.${Math.round(v)}`;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center gap-3 px-4">
        <Link
          href="/demo"
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-white flex-1">Retailer Network</h1>
        <span className="text-sm text-[#8892A8]">{zones.length} zones</span>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Total Retailers</p>
            <p className="text-2xl font-bold text-white">{zoneStats.reduce((s, z) => s + z.retailerCount, 0)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Active Zones</p>
            <p className="text-2xl font-bold text-[#FF9933]">{zones.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {zoneStats.map((z) => (
          <div key={z.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-white">{z.name}</p>
                <p className="text-xs text-[#8892A8]">{z.code}</p>
              </div>
              <span className="text-xs bg-[#FF9933]/15 text-[#FF9933] px-2 py-0.5 rounded-full font-medium">
                {z.retailerCount} retailers
              </span>
            </div>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-[10px] text-[#8892A8]/70 uppercase">Dead Stock</p>
                <p className={`text-sm font-semibold ${z.deadStockValue > 0 ? "text-[#E8453C]" : "text-[#10B981]"}`}>
                  {z.deadStockValue > 0 ? formatVal(z.deadStockValue) : "Clean"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#8892A8]/70 uppercase">Alerts</p>
                <p className="text-sm font-semibold text-white">{z.alertCount}</p>
              </div>
              {z.highRisk > 0 && (
                <div>
                  <p className="text-[10px] text-[#8892A8]/70 uppercase">High Risk</p>
                  <p className="text-sm font-semibold text-[#FF9933]">{z.highRisk}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
