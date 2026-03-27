export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/ingest/parsers";
import { sessionCache } from "@/lib/ingest/session-cache";
import { getCachedDistributor } from "@/lib/cache";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv", // .csv
  "application/pdf", // .pdf
];
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".pdf"];

function validateFileBytes(buffer: Buffer, ext: string): boolean {
  if (ext === ".xlsx" || ext === ".xls") {
    // XLSX files are ZIP: starts with PK (0x50 0x4B)
    // XLS files are OLE2: starts with D0 CF 11 E0
    const isPK = buffer[0] === 0x50 && buffer[1] === 0x4B;
    const isOLE = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    return isPK || isOLE;
  }
  if (ext === ".csv") {
    // CSV should be valid UTF-8 text (check first 1000 bytes)
    const sample = buffer.subarray(0, 1000).toString("utf8");
    return !sample.includes("\0"); // no null bytes = probably text
  }
  if (ext === ".pdf") {
    // PDF starts with %PDF
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;

    // Validate: file is present
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Upload a file using the 'file' field." },
        { status: 400 }
      );
    }

    // Validate: file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 10MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB.` },
        { status: 400 }
      );
    }

    // Validate: file type by extension
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf("."));
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type '${ext}'. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate: MIME type (fallback -- some browsers send wrong MIME)
    if (file.type && !ACCEPTED_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
      console.warn(`Unexpected MIME type '${file.type}' for ${fileName}, proceeding based on extension`);
    }

    // Get distributor
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json({ error: "No distributor found. Run /api/seed first." }, { status: 404 });
    }

    // Read file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes match claimed extension
    if (!validateFileBytes(buffer, ext)) {
      return NextResponse.json({ error: "File content does not match extension" }, { status: 400 });
    }

    // Parse the file
    const parsed = await parseFile(buffer, fileName, sheetName);

    // Determine file type from extension
    const fileType = ext === ".pdf" ? "pdf" : ext === ".csv" ? "csv" : "excel";

    // Create IngestionJob in DB
    const job = await prisma.ingestionJob.create({
      data: {
        distributorId: distributor.id,
        fileName: file.name,
        fileType,
        entityType: "unknown", // will be determined during mapping
        status: "uploaded",
        rowCount: parsed.totalRows,
      },
    });

    // Store parsed data in session cache
    sessionCache.set(job.id, "parsed", parsed);

    return NextResponse.json({
      jobId: job.id,
      fileName: file.name,
      fileType,
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      sampleRows: parsed.sampleRows,
      sheets: parsed.metadata.sheets || null,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded file" },
      { status: 500 }
    );
  }
}
