// GET /api/orders/batches -- list dispatch batches grouped by status

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedDistributor } from "@/lib/cache";

export async function GET() {
  try {
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json({ error: "No distributor" }, { status: 404 });
    }

    const batches = await prisma.dispatchBatch.findMany({
      where: { distributorId: distributor.id },
      include: {
        orders: {
          include: {
            order: {
              include: { retailer: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get zone names
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

    // Group by status
    const grouped = {
      planned: formatted.filter((b) => b.status === "planned"),
      dispatched: formatted.filter((b) => b.status === "dispatched"),
      delivered: formatted.filter((b) => b.status === "delivered"),
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Batches API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
