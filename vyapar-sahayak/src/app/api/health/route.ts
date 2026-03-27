export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const count = await prisma.distributor.count();
    return NextResponse.json({ ok: true, distributors: count });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json({ ok: false, error: "Health check failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Truncate all tables with CASCADE for PostgreSQL
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "DispatchBatchOrder", "OrderItem", "Order", "DispatchBatch",
        "AgentSuggestion", "Campaign", "Recommendation", "DeadStockAlert",
        "Inventory", "SalesLineItem", "SalesTransaction", "WhatsAppGroup",
        "Retailer", "Zone", "Product", "Distributor", "IngestionJob", "Embedding"
      CASCADE
    `);
    return NextResponse.json({ ok: true, cleared: true });
  } catch (error) {
    console.error("Health DELETE error:", error);
    return NextResponse.json({ ok: false, error: "Clear operation failed" }, { status: 500 });
  }
}
