export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { invalidateCampaign } from "@/lib/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { posterUrl } = await req.json();

  await prisma.campaign.update({
    where: { id },
    data: { posterUrl },
  });

  invalidateCampaign(id);

  return NextResponse.json({ success: true });
}
