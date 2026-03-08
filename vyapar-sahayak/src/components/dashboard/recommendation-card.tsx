"use client";

import { useState } from "react";

interface RecommendationCardProps {
  problem: string;
  solution: string;
  rationale: string;
  affectedZones: string[];
  costValue: number;
  recoveryValue: number;
  recoverySteps?: string[];
}

function formatCurrency(value: number): string {
  if (value >= 100000) {
    return "Rs." + (value / 100000).toFixed(1) + "L";
  }
  return "Rs." + value.toLocaleString("en-IN");
}

function ExpandableSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-gray-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export function RecommendationCard({
  problem,
  solution,
  rationale,
  affectedZones,
  costValue,
  recoveryValue,
  recoverySteps,
}: RecommendationCardProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Problem -> Solution card */}
      <div className="rounded-xl bg-white border-l-4 border-l-[#FF9933] border border-gray-200 shadow-sm p-4">
        <div className="mb-3">
          <p className="text-[10px] text-[#FF9933] uppercase tracking-wide font-semibold mb-1">
            Problem
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{problem}</p>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-3">
          <p className="text-[10px] text-[#10B981] uppercase tracking-wide font-semibold mb-1">
            Solution
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{solution}</p>
        </div>
      </div>

      {/* Expandable sections */}
      <ExpandableSection title="Rationale">
        <p className="text-sm text-gray-500 leading-relaxed pt-2">{rationale}</p>
      </ExpandableSection>

      {recoverySteps && recoverySteps.length > 0 && (
        <ExpandableSection title="Recovery Steps">
          <ol className="list-decimal list-inside space-y-1.5 pt-2">
            {recoverySteps.map((step, i) => (
              <li key={i} className="text-sm text-gray-500 leading-relaxed">{step}</li>
            ))}
          </ol>
        </ExpandableSection>
      )}

      <ExpandableSection title="Affected Territories">
        <div className="flex flex-wrap gap-2 pt-2">
          {affectedZones.map((zone) => (
            <span
              key={zone}
              className="px-2 py-1 rounded-full bg-orange-50 text-[#FF9933] text-xs font-medium"
            >
              {zone}
            </span>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection title="Cost vs Recovery">
        <div className="flex gap-6 pt-2">
          <div>
            <p className="text-[10px] text-gray-500/70 uppercase tracking-wide">Current Loss</p>
            <p className="text-sm font-semibold text-red-500">
              {formatCurrency(costValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500/70 uppercase tracking-wide">Est. Recovery</p>
            <p className="text-sm font-semibold text-[#10B981]">
              {formatCurrency(recoveryValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500/70 uppercase tracking-wide">Recovery %</p>
            <p className="text-sm font-semibold text-[#FF9933]">
              {costValue > 0 ? Math.round((recoveryValue / costValue) * 100) : 0}%
            </p>
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
}
