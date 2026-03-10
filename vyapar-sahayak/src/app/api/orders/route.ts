export const runtime = "nodejs";

// GET /api/orders -- orders grouped by zone

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedDistributor } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json({ error: "No distributor" }, { status: 404 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: any = { distributorId: distributor.id };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get zone names
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
        confirmedAt: order.confirmedAt?.toISOString() || null,
        dispatchedAt: order.dispatchedAt?.toISOString() || null,
      });
    }

    const result = Object.entries(groups).map(([zoneCode, zoneOrders]) => ({
      zoneCode,
      zoneName: zoneMap[zoneCode] || zoneCode,
      orderCount: zoneOrders.length,
      totalValue: Math.round(zoneOrders.reduce((s, o) => s + o.totalAmount, 0)),
      orders: zoneOrders,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Orders API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
