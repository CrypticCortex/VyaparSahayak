export const runtime = "nodejs";

// POST /api/order -- create an order from a campaign order link

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOrderToken } from "@/lib/order-token";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, retailerPhone, retailerName, quantity, notes } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { orderLink: token },
      include: { recommendation: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Invalid order link" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { name: campaign.productName },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 400 });
    }

    // Try to match retailer by phone, fall back to any retailer under this distributor
    let retailer = null;
    if (retailerPhone) {
      retailer = await prisma.retailer.findFirst({
        where: { whatsappNumber: retailerPhone },
        include: { zone: { select: { code: true } } },
      });
    }
    if (!retailer) {
      retailer = await prisma.retailer.findFirst({
        where: { zone: { distributorId: campaign.distributorId } },
        include: { zone: { select: { code: true } } },
      });
    }
    if (!retailer) {
      return NextResponse.json({ error: "No retailers found" }, { status: 400 });
    }

    const discountPct = campaign.recommendation?.discountPct || 20;
    const unitPrice = Math.round(product.mrp * (1 - discountPct / 100));
    const total = unitPrice * quantity;

    // Generate order number: ORD-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayCount = await prisma.order.count({
      where: { createdAt: { gte: startOfDay } },
    });
    const orderNumber = `ORD-${dateStr}-${String(todayCount + 1).padStart(3, "0")}`;

    const order = await prisma.order.create({
      data: {
        token: generateOrderToken(),
        retailerId: retailer.id,
        distributorId: campaign.distributorId,
        status: "pending",
        totalAmount: total,
        campaignId: campaign.id,
        zoneCode: retailer.zone?.code || "UNKNOWN",
        notes: notes || (retailerName ? `Retailer: ${retailerName}` : null),
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity,
        unitPrice,
        discount: discountPct,
        total,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      productName: product.name,
      quantity,
      total,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
