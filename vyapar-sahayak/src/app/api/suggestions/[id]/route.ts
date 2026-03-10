export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (status !== "acted" && status !== "dismissed") {
      return NextResponse.json(
        { error: "Status must be 'acted' or 'dismissed'" },
        { status: 400 }
      );
    }

    const existing = await prisma.agentSuggestion.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    const suggestion = await prisma.agentSuggestion.update({
      where: { id },
      data: {
        status,
        actedAt: new Date(),
      },
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Failed to update suggestion:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}
