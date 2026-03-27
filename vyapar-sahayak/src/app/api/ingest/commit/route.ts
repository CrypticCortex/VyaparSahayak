export const runtime = "nodejs";
export const maxDuration = 120; // Large datasets take time

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { commitIngestion } from "@/lib/ingest/loader";
import { sessionCache } from "@/lib/ingest/session-cache";
import type { PreviewRow, ColumnMapping, DuplicateMatch, IngestStats } from "@/lib/ingest/types";

interface PreviewData {
  rows: PreviewRow[];
  entityType: string;
  mappings: ColumnMapping[];
}

export async function POST(req: Request) {
  try {
    const { jobId, duplicateResolutions, skipRows } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Verify the IngestionJob exists and belongs to the distributor
    const job = await prisma.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get mapped/validated data from session cache
    const previewData = sessionCache.get<PreviewData>(jobId, "preview");
    if (!previewData) {
      return NextResponse.json(
        { error: "No preview data found for this job. Run the /api/ingest/preview step first." },
        { status: 404 }
      );
    }

    // Filter out rows that should be skipped
    const skipSet = new Set<number>(skipRows || []);
    const rowsToCommit = previewData.rows.filter(
      (r) => r.status !== "error" && !skipSet.has(r.rowIndex)
    );

    if (rowsToCommit.length === 0) {
      return NextResponse.json(
        { error: "No valid rows to commit. All rows have errors or are skipped." },
        { status: 400 }
      );
    }

    // Commit to database
    const stats: IngestStats = await commitIngestion(
      rowsToCommit,
      previewData.entityType,
      previewData.mappings,
      duplicateResolutions || {}
    );

    // Update IngestionJob with final stats
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "committed",
        successCount: rowsToCommit.length - stats.errorsSkipped,
        errorCount: stats.errorsSkipped,
        completedAt: new Date(),
      },
    });

    // Clear session cache for this job
    sessionCache.clear(jobId);

    return NextResponse.json({
      jobId,
      status: "committed",
      stats,
      redirectTo: "/demo",
    });
  } catch (error) {
    console.error("Commit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
