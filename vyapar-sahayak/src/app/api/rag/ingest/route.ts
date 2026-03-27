// src/app/api/rag/ingest/route.ts

export const maxDuration = 120;

import { NextResponse } from "next/server";
import { ingestProducts, ingestKnowledge, ingestCampaignResults } from "@/lib/rag/ingest";


export async function POST() {
  try {
    const products = await ingestProducts();
    const knowledge = await ingestKnowledge();
    const campaigns = await ingestCampaignResults();

    return NextResponse.json({
      success: true,
      products,
      knowledge,
      campaigns,
      total: products + knowledge + campaigns,
    });
  } catch (error) {
    console.error("RAG ingest error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
