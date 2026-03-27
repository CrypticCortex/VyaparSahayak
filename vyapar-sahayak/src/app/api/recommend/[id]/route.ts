export const runtime = "nodejs";
export const maxDuration = 120;

// src/app/api/recommend/[id]/route.ts

import { NextResponse } from "next/server";
import { generateRecommendationForAlert } from "@/lib/recommend";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateRecommendationForAlert(id);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommend error:", error);
    return NextResponse.json({ error: "Recommendation generation failed" }, { status: 500 });
  }
}
