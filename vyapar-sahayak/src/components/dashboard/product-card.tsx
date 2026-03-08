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
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {productName}
          </h3>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      {/* Metadata */}
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Value</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(stockValue)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Days Idle</p>
          <p className="text-sm font-semibold text-gray-900">{daysSinceLastSale}d</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Expiry</p>
          <p className={`text-sm font-semibold ${daysToExpiry < 30 ? "text-red-600" : "text-gray-900"}`}>
            {daysToExpiry}d
          </p>
        </div>
      </div>

      {/* AI suggestion */}
      {(suggestion || recommendationType) && (
        <div className="rounded-lg bg-orange-50 p-3 mb-3">
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
          <p className="text-xs text-orange-700 leading-relaxed">
            {suggestion || `Recommended: ${recommendationType || "analysis pending"}`}
          </p>
          {estimatedRecovery > 0 && (
            <p className="text-[10px] text-[#FF9933] font-medium mt-1">
              Est. recovery: {formatCurrency(estimatedRecovery)}
            </p>
          )}
        </div>
      )}

      {/* View recommendation link */}
      <Link
        href={`/demo/recommendations/${alertId}`}
        className="block text-center text-xs font-semibold text-[#FF9933] py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        View Recommendation
      </Link>
    </div>
  );
}
