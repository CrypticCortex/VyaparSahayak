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
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8892A8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-white/[0.06] bg-white/[0.02]">
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
      <div className="rounded-xl bg-white/[0.03] border-l-4 border-l-[#FF9933] border-r border-t border-b border-r-white/[0.06] border-t-white/[0.06] border-b-white/[0.06] p-4">
        <div className="mb-3">
          <p className="text-[10px] text-[#FF9933] uppercase tracking-wide font-semibold mb-1">
            Problem
          </p>
          <p className="text-sm text-white leading-relaxed">{problem}</p>
        </div>
        <div className="border-t border-dashed border-white/[0.08] pt-3">
          <p className="text-[10px] text-[#10B981] uppercase tracking-wide font-semibold mb-1">
            Solution
          </p>
          <p className="text-sm text-white leading-relaxed">{solution}</p>
        </div>
      </div>

      {/* Expandable sections */}
      <ExpandableSection title="Rationale">
        <p className="text-sm text-[#8892A8] leading-relaxed pt-2">{rationale}</p>
      </ExpandableSection>

      {recoverySteps && recoverySteps.length > 0 && (
        <ExpandableSection title="Recovery Steps">
          <ol className="list-decimal list-inside space-y-1.5 pt-2">
            {recoverySteps.map((step, i) => (
              <li key={i} className="text-sm text-[#8892A8] leading-relaxed">{step}</li>
            ))}
          </ol>
        </ExpandableSection>
      )}

      <ExpandableSection title="Affected Territories">
        <div className="flex flex-wrap gap-2 pt-2">
          {affectedZones.map((zone) => (
            <span
              key={zone}
              className="px-2 py-1 rounded-full bg-[#FF9933]/15 text-[#FF9933] text-xs font-medium"
            >
              {zone}
            </span>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection title="Cost vs Recovery">
        <div className="flex gap-6 pt-2">
          <div>
            <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Current Loss</p>
            <p className="text-sm font-semibold text-[#E8453C]">
              {formatCurrency(costValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Est. Recovery</p>
            <p className="text-sm font-semibold text-[#10B981]">
              {formatCurrency(recoveryValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Recovery %</p>
            <p className="text-sm font-semibold text-[#FF9933]">
              {costValue > 0 ? Math.round((recoveryValue / costValue) * 100) : 0}%
            </p>
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
}
