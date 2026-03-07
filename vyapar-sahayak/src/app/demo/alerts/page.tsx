import { getCachedDistributor, getCachedAlerts, getCachedProducts } from "@/lib/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertsList } from "./alerts-list";

export default async function AlertsPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-[#8892A8]">No data found. Run the seed script first.</p>
      </div>
    );
  }

  const alerts = await getCachedAlerts(distributor.id);

  const productIds = [...new Set(alerts.map((a) => a.productId))];
  const products = await getCachedProducts(productIds);
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const alertsWithNames = alerts.map((a) => ({
    id: a.id,
    productName: productMap[a.productId] || "Unknown Product",
    stockValue: a.stockValue,
    daysSinceLastSale: a.daysSinceLastSale,
    daysToExpiry: a.daysToExpiry,
    riskLevel: a.riskLevel,
    recommendationType: a.recommendationType,
    recommendationJson: a.recommendationJson,
  }));

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Top nav */}
      <div className="flex items-center gap-3 px-4">
        <Link
          href="/demo"
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-white flex-1">High-Risk Items</h1>
        <Badge className="bg-[#E8453C]/15 text-[#E8453C] border-0 text-xs">
          {alerts.length} items
        </Badge>
      </div>

      {/* Filter + List (client component) */}
      <AlertsList alerts={alertsWithNames} />
    </div>
  );
}
