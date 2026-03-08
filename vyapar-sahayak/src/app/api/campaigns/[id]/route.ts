import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
