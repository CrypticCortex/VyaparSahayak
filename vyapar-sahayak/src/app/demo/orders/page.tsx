import { prisma } from "@/lib/db";
import { getCachedDistributor } from "@/lib/cache";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
  const distributor = await getCachedDistributor();
  if (!distributor) {
    return <div className="p-4 text-center text-gray-500">No distributor found. Run seed first.</div>;
  }

  const orders = await prisma.order.findMany({
    where: { distributorId: distributor.id },
    include: {
      retailer: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const zones = await prisma.zone.findMany({
    where: { distributorId: distributor.id },
    select: { code: true, name: true },
  });
  const zoneMap = Object.fromEntries(zones.map((z) => [z.code, z.name]));

  // Group by zone
  const groups: Record<string, any[]> = {};
  for (const order of orders) {
    if (!groups[order.zoneCode]) groups[order.zoneCode] = [];
    groups[order.zoneCode].push({
      id: order.id,
      retailerName: order.retailer?.name || "Unknown",
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      createdAt: order.createdAt.toISOString(),
    });
  }

  const zoneGroups = Object.entries(groups).map(([zoneCode, zoneOrders]) => ({
    zoneCode,
    zoneName: zoneMap[zoneCode] || zoneCode,
    orderCount: zoneOrders.length,
    totalValue: Math.round(zoneOrders.reduce((s, o) => s + o.totalAmount, 0)),
    orders: zoneOrders,
  }));

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const todayValue = Math.round(orders.reduce((s, o) => s + o.totalAmount, 0));

  // Get suggestions
  const suggestions = await prisma.agentSuggestion.findMany({
    where: { distributorId: distributor.id, status: "pending", type: "order_intelligence" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <OrdersClient
      zoneGroups={zoneGroups}
      pendingCount={pendingCount}
      todayValue={todayValue}
      suggestions={suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        actionType: s.actionType,
        priority: s.priority,
      }))}
    />
  );
}
