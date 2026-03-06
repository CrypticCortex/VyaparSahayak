// POST /api/orders/batch -- create a dispatch batch

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCachedDistributor } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json({ error: "No distributor" }, { status: 404 });
    }

    const { zoneCode, orderIds, vehicleInfo, plannedDate } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds must be a non-empty array" }, { status: 400 });
    }
    if (!zoneCode) {
      return NextResponse.json({ error: "zoneCode is required" }, { status: 400 });
    }

    const batch = await prisma.dispatchBatch.create({
      data: {
        distributorId: distributor.id,
        zoneCode,
        status: "planned",
        vehicleInfo: vehicleInfo || null,
        plannedDate: plannedDate ? new Date(plannedDate) : new Date(),
        orders: {
          create: orderIds.map((orderId: string) => ({ orderId })),
        },
      },
      include: {
        orders: { include: { order: { select: { id: true, totalAmount: true, status: true } } } },
      },
    });

    // Update orders to dispatched
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: "dispatched", dispatchedAt: new Date() },
    });

    return NextResponse.json({
      id: batch.id,
      zoneCode: batch.zoneCode,
      orderCount: orderIds.length,
      totalValue: Math.round(batch.orders.reduce((s, o) => s + o.order.totalAmount, 0)),
      status: batch.status,
    });
  } catch (error) {
    console.error("Batch creation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
