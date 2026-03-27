"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { PreviewStep } from "./preview-step";
import { CommitStep } from "./commit-step";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map" },
  { key: "preview", label: "Preview" },
  { key: "done", label: "Done" },
] as const;

interface UploadResult {
  jobId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  sheets: string[];
}

interface MappingResult {
  language: string;
  mappings: MappingRow[];
  unmapped: string[];
  warnings: string[];
}

interface MappingRow {
  sourceColumn: string;
  sampleValue: string;
  targetField: string;
  targetGroup: string;
  confidence: number;
  transform: string | null;
}

interface PreviewData {
  validCount: number;
  errorCount: number;
  warningCount: number;
  rows: PreviewRow[];
  totalRows: number;
  duplicates: DuplicateEntry[];
}

interface PreviewRow {
  rowNumber: number;
  status: "valid" | "warning" | "error";
  data: Record<string, string>;
  issues: string[];
}

interface DuplicateEntry {
  id: string;
  sourceName: string;
  matchName: string;
  similarity: number;
  resolution: "merge" | "create" | "skip" | null;
}

interface CommitStats {
  productsCreated: number;
  inventoryRecords: number;
  deadStockAlerts: number;
  errorsSkipped: number;
}

export type { MappingRow, MappingResult, PreviewData, PreviewRow, DuplicateEntry, CommitStats };

export function IngestWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [commitStats, setCommitStats] = useState<CommitStats | null>(null);

  const handleUploadComplete = useCallback(
    (result: UploadResult) => {
      setJobId(result.jobId);
      setUploadResult(result);
      setCurrentStep(1);
    },
    []
  );

  const handleMappingComplete = useCallback(
    (result: MappingResult) => {
      setMappingResult(result);
      setCurrentStep(2);
    },
    []
  );

  const handlePreviewComplete = useCallback(
    (data: PreviewData) => {
      setPreviewData(data);
    },
    []
  );

  const handleCommitComplete = useCallback(
    (stats: CommitStats) => {
      setCommitStats(stats);
      setCurrentStep(3);
    },
    []
  );

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setJobId(null);
    setUploadResult(null);
    setMappingResult(null);
    setPreviewData(null);
    setCommitStats(null);
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your Tally export, Excel, CSV, or PDF to import products and inventory
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                      isCompleted
                        ? "bg-[#10B981] text-white"
                        : isActive
                        ? "bg-[#FF9933] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isCompleted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted
                        ? "text-[#10B981]"
                        : isActive
                        ? "text-[#FF9933]"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 mt-[-1.25rem]">
                    <div
                      className={`h-0.5 transition-colors duration-300 ${
                        index < currentStep ? "bg-[#10B981]" : "bg-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {currentStep === 0 && (
            <UploadStep onComplete={handleUploadComplete} />
          )}
          {currentStep === 1 && jobId && uploadResult && (
            <MappingStep
              jobId={jobId}
              headers={uploadResult.headers}
              sampleRows={uploadResult.sampleRows}
              onComplete={handleMappingComplete}
            />
          )}
          {currentStep === 2 && jobId && mappingResult && (
            <PreviewStep
              jobId={jobId}
              mappingResult={mappingResult}
              previewData={previewData}
              onPreviewLoaded={handlePreviewComplete}
              onCommitComplete={handleCommitComplete}
            />
          )}
          {currentStep === 3 && commitStats && (
            <CommitStep stats={commitStats} onReset={resetWizard} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
