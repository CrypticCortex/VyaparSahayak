"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UploadResult {
  jobId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  sheets: string[];
}

interface UploadStepProps {
  onComplete: (result: UploadResult) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string) {
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes(".sheet")) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-green-600">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "text/csv" || type.includes("csv")) {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-blue-600">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M8 13h2M8 17h2M14 13h2M14 17h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "application/pdf") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-red-600">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="7" y="18" fontSize="6" fill="currentColor" fontWeight="bold">PDF</text>
      </svg>
    );
  }
  // Generic file
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadStep({ onComplete }: UploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: Record<string, string>[];
    sheets: string[];
    jobId: string;
  } | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/pdf",
  ];
  const acceptedExtensions = [".xlsx", ".xls", ".csv", ".pdf"];

  const validateFile = (f: File): boolean => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext) && !acceptedTypes.includes(f.type)) {
      setError("Unsupported file type. Please upload .xlsx, .xls, .csv, or .pdf files.");
      return false;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50 MB.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleFile = useCallback((f: File) => {
    if (validateFile(f)) {
      setFile(f);
      setPreviewData(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleSampleFile = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/samples/tally-export-tamil.xlsx");
      if (!res.ok) throw new Error("Sample file not available");
      const blob = await res.blob();
      const sampleFile = new File([blob], "tally-export-tamil.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      setFile(sampleFile);
      setPreviewData(null);
    } catch {
      setError("Could not load sample file. Try uploading your own file instead.");
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingest/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setPreviewData({
        headers: data.headers || [],
        rows: data.sampleRows || [],
        sheets: data.sheets || [],
        jobId: data.jobId,
      });
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [file]);

  const handleContinue = useCallback(() => {
    if (!previewData) return;
    onComplete({
      jobId: previewData.jobId,
      headers: previewData.headers,
      sampleRows: previewData.rows,
      sheets: previewData.sheets,
    });
  }, [previewData, onComplete]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200 ${
              isDragOver
                ? "border-[#FF9933] bg-[#FF9933]/5"
                : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full transition-colors ${isDragOver ? "bg-[#FF9933]/10" : "bg-gray-100"}`}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isDragOver ? "text-[#FF9933]" : "text-gray-400"}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drag and drop your file here, or{" "}
                  <span className="text-[#FF9933] underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports Excel (.xlsx, .xls), CSV, and PDF -- up to 50 MB
                </p>
              </div>

              {/* File type icons */}
              <div className="flex items-center gap-6 mt-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-gray-400">Excel</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-gray-400">CSV</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-gray-400">PDF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample file button */}
          <div className="mt-4 text-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSampleFile();
              }}
              className="text-sm text-[#FF9933] hover:text-[#E68A2E] underline underline-offset-2 transition-colors"
            >
              Try with sample file (Tally export - Tamil)
            </button>
          </div>

          {/* Selected file info */}
          {file && !previewData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} -- {file.type || "unknown type"}
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#E68A2E] hover:to-[#E67300] text-white shrink-0"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  "Upload & Analyze"
                )}
              </Button>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {error}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Preview table */}
      {previewData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">File Preview</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Showing first {Math.min(previewData.rows.length, 10)} rows with {previewData.headers.length} columns
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getFileIcon(file?.type || "")}
                  <span className="text-sm text-gray-600">{file?.name}</span>
                </div>
              </div>

              {/* Sheet tabs */}
              {previewData.sheets.length > 1 && (
                <div className="flex gap-1 mb-4 border-b border-gray-200">
                  {previewData.sheets.map((sheet, i) => (
                    <button
                      key={sheet}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                        activeSheet === i
                          ? "bg-[#FF9933]/10 text-[#FF9933] border-b-2 border-[#FF9933]"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 w-10">
                        #
                      </th>
                      {previewData.headers.map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                      >
                        <td className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                          {i + 1}
                        </td>
                        {previewData.headers.map((header) => (
                          <td
                            key={header}
                            className="px-3 py-2 text-xs text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {row[header] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Continue button */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleContinue}
                  className="bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#E68A2E] hover:to-[#E67300] text-white"
                >
                  Continue to Column Mapping
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
