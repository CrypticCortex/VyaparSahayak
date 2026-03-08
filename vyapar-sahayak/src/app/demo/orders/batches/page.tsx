import { prisma } from "@/lib/db";
import { getCachedDistributor } from "@/lib/cache";
import { BatchesClient } from "./batches-client";

export default async function BatchesPage() {
  const distributor = await getCachedDistributor();
  if (!distributor) {
    return <div className="p-4 text-center text-gray-500">No distributor found.</div>;
  }

  const batches = await prisma.dispatchBatch.findMany({
    where: { distributorId: distributor.id },
    include: {
      orders: {
        include: {
          order: { include: { retailer: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const zones = await prisma.zone.findMany({
    where: { distributorId: distributor.id },
    select: { code: true, name: true },
  });
  const zoneMap = Object.fromEntries(zones.map((z) => [z.code, z.name]));

  const formatted = batches.map((b) => ({
    id: b.id,
    zoneCode: b.zoneCode,
    zoneName: zoneMap[b.zoneCode] || b.zoneCode,
    status: b.status,
    vehicleInfo: b.vehicleInfo,
    plannedDate: b.plannedDate?.toISOString() || null,
    dispatchedAt: b.dispatchedAt?.toISOString() || null,
    orderCount: b.orders.length,
    totalValue: Math.round(b.orders.reduce((s, o) => s + o.order.totalAmount, 0)),
    orders: b.orders.map((o) => ({
      id: o.order.id,
      retailerName: o.order.retailer?.name || "Unknown",
      totalAmount: o.order.totalAmount,
      status: o.order.status,
    })),
  }));

  return <BatchesClient batches={formatted} />;
}
