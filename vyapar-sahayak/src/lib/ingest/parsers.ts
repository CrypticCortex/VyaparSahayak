import * as XLSX from "xlsx";
import type { ParsedFile } from "./types";

function detectFileType(fileName: string): "excel" | "csv" | "pdf" {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (ext === "csv") return "csv";
  if (ext === "pdf") return "pdf";
  return "excel";
}


function parseSpreadsheet(
  buffer: Buffer,
  fileName: string,
  fileType: "excel" | "csv",
  sheetName?: string,
): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;

  const targetSheet = sheetName && sheetNames.includes(sheetName)
    ? sheetName
    : sheetNames[0];

  const sheet = workbook.Sheets[targetSheet];
  if (!sheet) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      sampleRows: [],
      metadata: { fileName, fileType, sheets: sheetNames },
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const sampleRows = rows.slice(0, 10);

  return {
    headers,
    rows,
    totalRows: rows.length,
    sampleRows,
    metadata: {
      fileName,
      fileType,
      sheetName: targetSheet,
      sheets: sheetNames.length > 1 ? sheetNames : undefined,
    },
  };
}


async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  const { PDFParse } = await import("pdf-parse");

  let text: string;
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
  } catch {
    // Scanned / image-only PDF
    return {
      headers: ["raw_text"],
      rows: [],
      totalRows: 0,
      sampleRows: [],
      metadata: { fileName, fileType: "pdf" },
    };
  }

  if (!text || text.trim().length === 0) {
    return {
      headers: ["raw_text"],
      rows: [],
      totalRows: 0,
      sampleRows: [],
      metadata: { fileName, fileType: "pdf" },
    };
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Detect delimiter: tab > pipe > comma
  const tabCount = lines.reduce((n, l) => n + (l.includes("\t") ? 1 : 0), 0);
  const pipeCount = lines.reduce((n, l) => n + (l.includes("|") ? 1 : 0), 0);
  const commaCount = lines.reduce((n, l) => n + (l.includes(",") ? 1 : 0), 0);

  const tabRatio = tabCount / lines.length;
  const pipeRatio = pipeCount / lines.length;
  const commaRatio = commaCount / lines.length;

  const isTabular = tabRatio > 0.5 || pipeRatio > 0.5 || commaRatio > 0.5;

  if (!isTabular) {
    // Return raw text lines as single-column rows
    const rows = lines.map((line) => ({ raw_text: line }));
    return {
      headers: ["raw_text"],
      rows,
      totalRows: rows.length,
      sampleRows: rows.slice(0, 10),
      metadata: { fileName, fileType: "pdf" },
    };
  }

  // Pick the best delimiter
  let delimiter = "\t";
  if (pipeRatio >= tabRatio && pipeRatio >= commaRatio) delimiter = "|";
  else if (commaRatio >= tabRatio) delimiter = ",";

  const splitLines = lines.map((l) =>
    l.split(delimiter).map((cell) => cell.trim())
  );

  // First line as headers
  const headers = splitLines[0] || [];
  const dataLines = splitLines.slice(1);

  const rows = dataLines.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
    sampleRows: rows.slice(0, 10),
    metadata: { fileName, fileType: "pdf" },
  };
}


export async function parseFile(
  buffer: Buffer,
  fileName: string,
  sheetName?: string | null,
): Promise<ParsedFile> {
  const fileType = detectFileType(fileName);

  if (fileType === "pdf") {
    return parsePDF(buffer, fileName);
  }

  return parseSpreadsheet(buffer, fileName, fileType, sheetName ?? undefined);
}
