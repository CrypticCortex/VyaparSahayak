"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MappingResult, PreviewData, PreviewRow, DuplicateEntry } from "./wizard";

interface PreviewStepProps {
  jobId: string;
  mappingResult: MappingResult;
  previewData: PreviewData | null;
  onPreviewLoaded: (data: PreviewData) => void;
  onCommitComplete: (stats: {
    productsCreated: number;
    inventoryRecords: number;
    deadStockAlerts: number;
    errorsSkipped: number;
  }) => void;
}

function StatusIcon({ status }: { status: "valid" | "warning" | "error" }) {
  if (status === "valid") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PreviewStep({
  jobId,
  mappingResult,
  previewData,
  onPreviewLoaded,
  onCommitComplete,
}: PreviewStepProps) {
  const [loading, setLoading] = useState(!previewData);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreviewData | null>(previewData);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, "merge" | "create" | "skip">>({});

  // Fetch preview data on mount if not already provided
  useEffect(() => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPreview() {
      try {
        const res = await fetch("/api/ingest/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, mappings: mappingResult.mappings }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Preview failed (${res.status})`);
        }

        const result = await res.json();
        if (cancelled) return;

        const preview: PreviewData = {
          validCount: result.validCount || 0,
          errorCount: result.errorCount || 0,
          warningCount: result.warningCount || 0,
          rows: result.rows || [],
          totalRows: result.totalRows || 0,
          duplicates: result.duplicates || [],
        };

        setData(preview);
        onPreviewLoaded(preview);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => { cancelled = true; };
  }, [jobId, mappingResult, previewData, onPreviewLoaded]);

  const handleDuplicateResolution = useCallback(
    (id: string, resolution: "merge" | "create" | "skip") => {
      setDuplicateResolutions((prev) => ({ ...prev, [id]: resolution }));
    },
    []
  );

  const hasUnresolvedDuplicates =
    data?.duplicates && data.duplicates.length > 0
      ? data.duplicates.some((d) => !duplicateResolutions[d.id])
      : false;

  const hasUnresolvedErrors = data ? data.errorCount > 0 : false;

  const handleCommit = useCallback(async () => {
    setCommitting(true);
    setError(null);

    try {
      const res = await fetch("/api/ingest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          duplicateResolutions,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Commit failed (${res.status})`);
      }

      const stats = await res.json();
      onCommitComplete({
        productsCreated: stats.productsCreated || 0,
        inventoryRecords: stats.inventoryRecords || 0,
        deadStockAlerts: stats.deadStockAlerts || 0,
        errorsSkipped: stats.errorsSkipped || 0,
      });
    } catch (err: any) {
      setError(err.message || "Failed to commit data");
    } finally {
      setCommitting(false);
    }
  }, [jobId, duplicateResolutions, onCommitComplete]);

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-[#FF9933] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-700">Validating data...</p>
            <p className="text-xs text-gray-400 mt-1">
              Checking for errors, duplicates, and data quality issues
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state with no data
  if (error && !data) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Validation failed</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const displayedRows = data.rows.slice(0, 50);
  const mappedFields = mappingResult.mappings
    .filter((m) => m.targetField)
    .map((m) => m.targetField);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-green-600">{data.validCount.toLocaleString()}</span> valid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-red-600">{data.errorCount.toLocaleString()}</span> errors
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-yellow-600">{data.warningCount.toLocaleString()}</span> warnings
              </span>
            </div>
            <div className="ml-auto text-xs text-gray-400">
              Showing {displayedRows.length} of {data.totalRows.toLocaleString()} rows
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 sticky top-0 z-10">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-b border-gray-200 w-10">
                    Status
                  </th>
                  {mappedFields.map((field) => (
                    <th
                      key={field}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                    >
                      {field.split(".").pop()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <AnimatePresence key={row.rowNumber}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        row.rowNumber % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      } ${
                        row.status === "error"
                          ? "bg-red-50/50"
                          : row.status === "warning"
                          ? "bg-yellow-50/30"
                          : ""
                      } hover:bg-gray-100/50`}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === row.rowNumber ? null : row.rowNumber
                        )
                      }
                    >
                      <td className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                        {row.rowNumber}
                      </td>
                      <td className="px-3 py-2 text-center border-b border-gray-100">
                        <StatusIcon status={row.status} />
                      </td>
                      {mappedFields.map((field) => (
                        <td
                          key={field}
                          className="px-3 py-2 text-xs text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-[180px] truncate"
                        >
                          {row.data[field] || ""}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded row -- show issues */}
                    {expandedRow === row.rowNumber && row.issues.length > 0 && (
                      <motion.tr
                        key={`${row.rowNumber}-expanded`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <td
                          colSpan={mappedFields.length + 2}
                          className="px-6 py-3 bg-gray-50 border-b border-gray-200"
                        >
                          <div className="space-y-1">
                            {row.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500 mt-0.5 shrink-0">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <path d="M12 9v4M12 17h.01" />
                                </svg>
                                <span className="text-gray-600">{issue}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate resolution */}
      {data.duplicates && data.duplicates.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Duplicate Resolution ({data.duplicates.length} found)
            </h3>

            <div className="space-y-3">
              {data.duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="p-4 bg-yellow-50/50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {dup.sourceName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        matches <span className="font-medium text-gray-700">{dup.matchName}</span>{" "}
                        <span className="text-[#FF9933] font-medium">
                          ({Math.round(dup.similarity * 100)}% similar)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {(["merge", "create", "skip"] as const).map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                          duplicateResolutions[dup.id] === option
                            ? "bg-[#FF9933]/10 text-[#FF9933] ring-1 ring-[#FF9933]/30"
                            : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`dup-${dup.id}`}
                          value={option}
                          checked={duplicateResolutions[dup.id] === option}
                          onChange={() => handleDuplicateResolution(dup.id, option)}
                          className="sr-only"
                        />
                        {option === "merge" && "Merge"}
                        {option === "create" && "Create New"}
                        {option === "skip" && "Skip"}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error inline */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Commit button */}
      <div className="flex justify-end">
        <Button
          onClick={handleCommit}
          disabled={committing || hasUnresolvedDuplicates}
          className="bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#E68A2E] hover:to-[#E67300] text-white disabled:opacity-50"
        >
          {committing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Committing...
            </span>
          ) : (
            <>
              Commit to Database
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
