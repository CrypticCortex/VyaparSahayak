import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    const [distributorCount, alertCount, openAlerts, campaignCount, distributor] = await Promise.all([
      prisma.distributor.count(),
      prisma.deadStockAlert.count(),
      prisma.deadStockAlert.count({ where: { status: "open" } }),
      prisma.campaign.count(),
      prisma.distributor.findFirst({ select: { id: true, name: true } }),
    ]);
    return NextResponse.json({
      pong: true,
      distributors: distributorCount,
      alerts: alertCount,
      openAlerts,
      campaigns: campaignCount,
      distributorId: distributor?.id,
      dbUrl: process.env.DATABASE_URL?.substring(0, 30),
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ pong: true, error: String(error), time: new Date().toISOString() }, { status: 500 });
  }
}
