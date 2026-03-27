export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionCache } from "@/lib/ingest/session-cache";
import { applyTransform } from "@/lib/ingest/transforms";
import { validateRow } from "@/lib/ingest/validator";
import { findDuplicates } from "@/lib/ingest/dedup";
import type {
  ParsedFile,
  MappingResult,
  ColumnMapping,
  PreviewRow,
  DuplicateMatch,
} from "@/lib/ingest/types";

export async function POST(req: Request) {
  try {
    const { jobId, mappings, entityType } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Verify the IngestionJob exists and belongs to the distributor
    const job = await prisma.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const VALID_ENTITY_TYPES = ["products", "retailers", "inventory", "sales", "mixed"];
    if (entityType && !VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    // Get parsed data from session cache
    const parsed = sessionCache.get<ParsedFile>(jobId, "parsed");
    if (!parsed) {
      return NextResponse.json(
        { error: "No parsed data found for this job. Upload a file first." },
        { status: 404 }
      );
    }

    // Use provided mappings or fall back to cached mapping result
    let columnMappings: ColumnMapping[];
    let resolvedEntityType: string;

    if (mappings && entityType) {
      // User provided edited mappings
      columnMappings = mappings;
      resolvedEntityType = entityType;
    } else {
      // Use mappings from the map step
      const cachedMapping = sessionCache.get<MappingResult>(jobId, "mapping");
      if (!cachedMapping) {
        return NextResponse.json(
          { error: "No mapping found. Run the /api/ingest/map step first or provide mappings." },
          { status: 400 }
        );
      }
      columnMappings = cachedMapping.mappings;
      resolvedEntityType = cachedMapping.entityType;
    }

    // Apply mappings to each row
    const previewRows: PreviewRow[] = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < parsed.rows.length; i++) {
      const sourceRow = parsed.rows[i];
      const mapped: Record<string, unknown> = {};

      // Apply each column mapping
      for (const mapping of columnMappings) {
        if (!mapping.targetField) continue; // unmapped column

        const rawValue = sourceRow[mapping.sourceColumn];
        if (rawValue === undefined || rawValue === null || rawValue === "") continue;

        // Apply transform if specified
        const transformed = mapping.transform && mapping.transform !== "none"
          ? applyTransform(rawValue, mapping.transform)
          : rawValue;

        mapped[mapping.targetField] = transformed;
      }

      // Validate the mapped row
      const issues = validateRow(mapped, resolvedEntityType);

      let status: PreviewRow["status"] = "valid";
      if (issues.some((v) => v.type === "required" || v.type === "type_mismatch")) {
        status = "error";
        errorCount++;
      } else if (issues.length > 0) {
        status = "warning";
        warningCount++;
      } else {
        validCount++;
      }

      previewRows.push({
        rowIndex: i,
        mapped,
        status,
        issues,
      });
    }

    // Find duplicates for product names
    const productNames = previewRows
      .filter((r) => r.status !== "error" && r.mapped.name)
      .map((r) => String(r.mapped.name));
    const duplicates: DuplicateMatch[] = productNames.length > 0
      ? await findDuplicates(productNames, resolvedEntityType)
      : [];

    // Mark duplicate rows with warnings
    for (const dup of duplicates) {
      const row = previewRows.find(
        (r) => r.mapped.name && String(r.mapped.name) === dup.incomingName
      );
      if (row) {
        row.issues.push({
          field: "name",
          type: "possible_duplicate",
          message: `Similar to existing: "${dup.existingName}" (${Math.round(dup.similarity * 100)}% match)`,
          existingId: dup.existingId,
          similarity: dup.similarity,
        });
        if (row.status === "valid") {
          row.status = "warning";
          validCount--;
          warningCount++;
        }
      }
    }

    // Store mapped/validated data in session cache for commit step
    sessionCache.set(jobId, "preview", {
      rows: previewRows,
      entityType: resolvedEntityType,
      mappings: columnMappings,
    });

    // Update IngestionJob status
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: "previewed" },
    });

    // Build response stats
    const stats = {
      byStatus: { valid: validCount, warning: warningCount, error: errorCount },
      byEntity: resolvedEntityType,
    };

    return NextResponse.json({
      totalRows: parsed.totalRows,
      validRows: validCount,
      errorRows: errorCount,
      warningRows: warningCount,
      preview: previewRows.slice(0, 50), // first 50 for UI preview
      duplicates,
      stats,
    });
  } catch (error) {
    console.error("Preview API error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
