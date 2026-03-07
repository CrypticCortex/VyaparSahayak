import Link from "next/link";
import { RiskBadge } from "@/components/dashboard/risk-badge";

interface ProductCardProps {
  alertId: string;
  productName: string;
  stockValue: number;
  daysSinceLastSale: number;
  daysToExpiry: number;
  riskLevel: string;
  recommendationType?: string | null;
  recommendationJson?: string | null;
}

function formatCurrency(value: number): string {
  if (value >= 100000) {
    return "Rs." + (value / 100000).toFixed(1) + "L";
  }
  return "Rs." + value.toLocaleString("en-IN");
}

export function ProductCard({
  alertId,
  productName,
  stockValue,
  daysSinceLastSale,
  daysToExpiry,
  riskLevel,
  recommendationType,
  recommendationJson,
}: ProductCardProps) {
  // Parse recommendation if available
  let suggestion = "";
  let estimatedRecovery = 0;
  if (recommendationJson) {
    try {
      const rec = JSON.parse(recommendationJson);
      suggestion = rec.aiSolution || rec.aiProblem || rec.suggestion || rec.rationale || "";
      estimatedRecovery = rec.estimatedRecovery || 0;
    } catch {
      // ignore parse errors
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {productName}
          </h3>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      {/* Metadata */}
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Value</p>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(stockValue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Days Idle</p>
          <p className="text-sm font-semibold text-white">{daysSinceLastSale}d</p>
        </div>
        <div>
          <p className="text-[10px] text-[#8892A8]/70 uppercase tracking-wide">Expiry</p>
          <p className={`text-sm font-semibold ${daysToExpiry < 30 ? "text-[#E8453C]" : "text-white"}`}>
            {daysToExpiry}d
          </p>
        </div>
      </div>

      {/* AI suggestion */}
      {(suggestion || recommendationType) && (
        <div className="rounded-lg bg-[#FF9933]/10 p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[10px] font-semibold text-[#FF9933] uppercase">
              AI Suggestion
            </span>
          </div>
          <p className="text-xs text-[#FF9933]/80 leading-relaxed">
            {suggestion || `Recommended: ${recommendationType || "analysis pending"}`}
          </p>
          {estimatedRecovery > 0 && (
            <p className="text-[10px] text-[#FF9933] mt-1">
              Est. recovery: {formatCurrency(estimatedRecovery)}
            </p>
          )}
        </div>
      )}

      {/* View recommendation link */}
      <Link
        href={`/demo/recommendations/${alertId}`}
        className="block text-center text-xs font-semibold text-[#FF9933] py-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
      >
        View Recommendation
      </Link>
    </div>
  );
}
