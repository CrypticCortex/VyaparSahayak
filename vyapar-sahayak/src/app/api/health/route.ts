import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const count = await prisma.distributor.count();
    return NextResponse.json({ ok: true, distributors: count });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Minimal clear -- just delete distributor to trigger AutoSeed
    // FK cascades or ordered deletes
    await prisma.dispatchBatchOrder.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.dispatchBatch.deleteMany();
    await prisma.agentSuggestion.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.recommendation.deleteMany();
    await prisma.deadStockAlert.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.salesLineItem.deleteMany();
    await prisma.salesTransaction.deleteMany();
    await prisma.whatsAppGroup.deleteMany();
    await prisma.retailer.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.product.deleteMany();
    await prisma.distributor.deleteMany();
    return NextResponse.json({ ok: true, cleared: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
