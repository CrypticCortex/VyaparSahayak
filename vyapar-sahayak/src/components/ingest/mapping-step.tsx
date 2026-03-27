"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MappingRow, MappingResult } from "./wizard";

// Schema fields grouped by entity -- used as dropdown options
const SCHEMA_FIELDS: Record<string, string[]> = {
  Product: [
    "product.name",
    "product.sku",
    "product.category",
    "product.subcategory",
    "product.brand",
    "product.mrp",
    "product.purchasePrice",
    "product.sellingPrice",
    "product.unit",
    "product.hsnCode",
    "product.gstRate",
    "product.barcode",
  ],
  Inventory: [
    "inventory.quantity",
    "inventory.batchNumber",
    "inventory.expiryDate",
    "inventory.manufacturingDate",
    "inventory.warehouseLocation",
    "inventory.reorderLevel",
  ],
  Retailer: [
    "retailer.name",
    "retailer.phone",
    "retailer.address",
    "retailer.gstNumber",
    "retailer.zone",
  ],
  Order: [
    "order.date",
    "order.invoiceNumber",
    "order.quantity",
    "order.amount",
    "order.discount",
    "order.status",
  ],
};

interface MappingStepProps {
  jobId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  onComplete: (result: MappingResult) => void;
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 0.8) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        {Math.round(value * 100)}%
      </span>
    );
  }
  if (value >= 0.6) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        {Math.round(value * 100)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      {Math.round(value * 100)}%
    </span>
  );
}

export function MappingStep({ jobId, headers, sampleRows, onComplete }: MappingStepProps) {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("");
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dotCount, setDotCount] = useState(0);

  // Animated dots for loading state
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch AI mappings on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchMappings() {
      try {
        const res = await fetch("/api/ingest/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Mapping failed (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        setLanguage(data.language || "Unknown");
        setMappings(data.mappings || []);
        setUnmapped(data.unmapped || []);
        setWarnings(data.warnings || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to generate mappings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMappings();
    return () => { cancelled = true; };
  }, [jobId]);

  const handleTargetChange = useCallback((index: number, newTarget: string) => {
    setMappings((prev) => {
      const updated = [...prev];
      const parts = newTarget.split(".");
      updated[index] = {
        ...updated[index],
        targetField: newTarget,
        targetGroup: parts[0] || updated[index].targetGroup,
      };
      return updated;
    });
  }, []);

  const handleApply = useCallback(async () => {
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/ingest/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mappings }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Preview generation failed (${res.status})`);
      }

      onComplete({
        language,
        mappings,
        unmapped,
        warnings,
      });
    } catch (err: any) {
      setError(err.message || "Failed to apply mappings");
    } finally {
      setApplying(false);
    }
  }, [jobId, mappings, language, unmapped, warnings, onComplete]);

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
            <p className="text-sm font-medium text-gray-700">
              Mapping with AI{".".repeat(dotCount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Detecting language and matching columns to your schema
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && mappings.length === 0) {
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
            <p className="text-sm font-medium text-gray-900">Mapping failed</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get sample value for a source column
  const getSampleValue = (col: string): string => {
    if (!sampleRows.length) return "";
    return sampleRows[0][col] || "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">AI Column Mapping</h3>
              {language && (
                <Badge className="bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/20">
                  {language}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {mappings.length} of {mappings.length + unmapped.length} columns mapped
            </span>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-600 mt-0.5 shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
                <div className="space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-800">{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mapping rows */}
          <div className="space-y-2">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_32px_1fr_80px_100px] gap-3 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span>Source Column</span>
              <span />
              <span>Target Field</span>
              <span className="text-center">Confidence</span>
              <span className="text-center">Transform</span>
            </div>

            {mappings.map((mapping, index) => (
              <motion.div
                key={mapping.sourceColumn}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-1 sm:grid-cols-[1fr_32px_1fr_80px_100px] gap-2 sm:gap-3 items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {/* Source column */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{mapping.sourceColumn}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    e.g. {getSampleValue(mapping.sourceColumn) || "--"}
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Target field dropdown */}
                <div>
                  <select
                    value={mapping.targetField}
                    onChange={(e) => handleTargetChange(index, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933]"
                  >
                    <option value="">-- Not mapped --</option>
                    {Object.entries(SCHEMA_FIELDS).map(([group, fields]) => (
                      <optgroup key={group} label={group}>
                        {fields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Confidence */}
                <div className="flex justify-center">
                  <ConfidenceBadge value={mapping.confidence} />
                </div>

                {/* Transform */}
                <div className="flex justify-center">
                  {mapping.transform ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {mapping.transform}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">--</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Unmapped columns */}
          {unmapped.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Unmapped Columns</h4>
              <div className="flex flex-wrap gap-2">
                {unmapped.map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                  >
                    {col}
                    <span className="ml-1.5 text-gray-300">Not mapped</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error inline */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {error}
            </motion.div>
          )}

          {/* Apply button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleApply}
              disabled={applying || mappings.filter((m) => m.targetField).length === 0}
              className="bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#E68A2E] hover:to-[#E67300] text-white"
            >
              {applying ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Applying...
                </span>
              ) : (
                <>
                  Apply Mappings
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
