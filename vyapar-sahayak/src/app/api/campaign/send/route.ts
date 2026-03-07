// src/app/api/campaign/send/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json();
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Simulated send - just update status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sent", sentAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign sent successfully (simulated)",
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
