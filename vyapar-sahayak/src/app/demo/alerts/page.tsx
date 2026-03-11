export const dynamic = "force-dynamic";

import { getCachedDistributor, getCachedAlerts, getCachedProducts } from "@/lib/cache";
import { AlertsList } from "./alerts-list";

export default async function AlertsPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">No data found. Run the seed script first.</p>
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
    <div className="p-4 lg:p-6">
      <AlertsList alerts={alertsWithNames} />
    </div>
  );
}
