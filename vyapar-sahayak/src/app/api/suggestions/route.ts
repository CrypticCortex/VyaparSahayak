export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCachedDistributor } from "@/lib/cache";
import { prisma } from "@/lib/db";

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export async function GET() {
  try {
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json(
        { error: "No distributor found" },
        { status: 404 }
      );
    }

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const suggestions = await prisma.agentSuggestion.findMany({
      where: {
        distributorId: distributor.id,
        status: "pending",
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    // sort by priority then createdAt desc (Prisma can't do custom priority ordering)
    suggestions.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 1;
      const pB = PRIORITY_ORDER[b.priority] ?? 1;
      if (pA !== pB) return pA - pB;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
