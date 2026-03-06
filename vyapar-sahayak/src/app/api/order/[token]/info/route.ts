// GET /api/order/[token]/info -- returns campaign + product data for an order link

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { orderLink: token },
      include: { recommendation: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: { name: campaign.productName },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const distributor = await prisma.distributor.findUnique({
      where: { id: campaign.distributorId },
    });

    const discountPct = campaign.recommendation?.discountPct || 20;

    return NextResponse.json({
      productName: product.name,
      productBrand: product.brand,
      posterUrl: campaign.posterUrl || null,
      offerHeadline: campaign.offerHeadline || null,
      offerDetails: campaign.offerDetails || null,
      price: product.mrp,
      discountPct,
      discountedPrice: Math.round(product.mrp * (1 - discountPct / 100)),
      distributorName: distributor?.name || "Kalyan Traders",
      campaignId: campaign.id,
    });
  } catch (error) {
    console.error("Order info error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
