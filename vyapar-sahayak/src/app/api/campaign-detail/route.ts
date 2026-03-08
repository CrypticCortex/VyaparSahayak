import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { recommendation: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const zones = await prisma.zone.findMany({
    where: { distributorId: campaign.distributorId },
    include: { _count: { select: { retailers: true } } },
  });

  return NextResponse.json({ campaign, zones });
}
