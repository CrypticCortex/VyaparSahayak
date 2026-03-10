export const runtime = "nodejs";

// PATCH /api/orders/batch/[id] -- update batch status, cascade to orders

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["dispatched", "delivered"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be dispatched or delivered" },
        { status: 400 }
      );
    }

    const batch = await prisma.dispatchBatch.findUnique({
      where: { id },
      include: { orders: { select: { orderId: true } } },
    });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const data: any = { status };
    if (status === "dispatched") data.dispatchedAt = new Date();

    await prisma.dispatchBatch.update({ where: { id }, data });

    // Cascade to orders
    const orderIds = batch.orders.map((o) => o.orderId);
    const orderData: any = { status };
    if (status === "dispatched") orderData.dispatchedAt = new Date();
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: orderData,
    });

    return NextResponse.json({ id, status, ordersUpdated: orderIds.length });
  } catch (error) {
    console.error("Batch update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
