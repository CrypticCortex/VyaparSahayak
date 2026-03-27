export const runtime = "nodejs";
export const maxDuration = 60; // Opus calls can take longer

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapColumns } from "@/lib/ingest/mapper";
import { sessionCache } from "@/lib/ingest/session-cache";
import type { ParsedFile } from "@/lib/ingest/types";

export async function POST(req: Request) {
  try {
    const { jobId, sheetName, entityTypeHint } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Verify the IngestionJob exists and belongs to the distributor
    const job = await prisma.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get parsed data from session cache
    const parsed = sessionCache.get<ParsedFile>(jobId, "parsed");
    if (!parsed) {
      return NextResponse.json(
        { error: "No parsed data found for this job. Upload a file first." },
        { status: 404 }
      );
    }

    // Use first 5 rows as samples for LLM mapping
    const sampleRows = parsed.rows.slice(0, 5);

    // Call LLM mapper with headers + sample rows
    const mappingResult = await mapColumns(
      parsed.headers,
      sampleRows,
      entityTypeHint || undefined,
      sheetName || undefined
    );

    // Update IngestionJob status and store mapping
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "mapped",
        entityType: mappingResult.entityType,
        mappingJson: JSON.stringify(mappingResult),
      },
    });

    // Store mapping result in session cache for preview step
    sessionCache.set(jobId, "mapping", mappingResult);

    return NextResponse.json(mappingResult);
  } catch (error) {
    console.error("Map API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
