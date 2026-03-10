export const runtime = "nodejs";

// PATCH /api/orders/[id] -- update order status

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["dispatched"],
  dispatched: ["delivered"],
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, reason } = await req.json();

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 400 }
      );
    }

    const data: any = { status };
    if (status === "confirmed") data.confirmedAt = new Date();
    if (status === "dispatched") data.dispatchedAt = new Date();
    if (status === "cancelled" && reason) data.notes = `Rejected: ${reason}`;

    const updated = await prisma.order.update({ where: { id }, data });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
