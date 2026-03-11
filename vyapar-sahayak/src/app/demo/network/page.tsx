export const dynamic = "force-dynamic";

import { getCachedDistributor, getCachedNetworkData } from "@/lib/cache";

export default async function NetworkPage() {
  const distributor = await getCachedDistributor();
  if (!distributor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500">No data. Run seed first.</p>
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
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Retailer Network</h1>
        <span className="text-sm text-gray-500">{zones.length} zones</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Retailers</p>
          <p className="text-2xl font-bold text-gray-900">{zoneStats.reduce((s, z) => s + z.retailerCount, 0)}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Active Zones</p>
          <p className="text-2xl font-bold text-[#FF9933]">{zones.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {zoneStats.map((z) => (
          <div key={z.id} className="rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{z.name}</p>
                <p className="text-xs text-gray-500">{z.code}</p>
              </div>
              <span className="text-xs bg-[#FF9933]/15 text-[#FF9933] px-2 py-0.5 rounded-full font-medium">
                {z.retailerCount} retailers
              </span>
            </div>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Dead Stock</p>
                <p className={`text-sm font-semibold ${z.deadStockValue > 0 ? "text-red-600" : "text-green-600"}`}>
                  {z.deadStockValue > 0 ? formatVal(z.deadStockValue) : "Clean"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Alerts</p>
                <p className="text-sm font-semibold text-gray-900">{z.alertCount}</p>
              </div>
              {z.highRisk > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">High Risk</p>
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
