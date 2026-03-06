"use client";

interface SuggestionProps {
  id: string;
  type: string;
  title: string;
  description: string;
  actionType: string;
  actionPayload: string;
  priority: string;
}

interface SuggestionCardProps {
  suggestion: SuggestionProps;
  onDismiss: (id: string) => void;
  onAction: (suggestion: SuggestionProps) => void;
}

const PRIORITY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  high: { border: "border-l-[#FF6F00]", bg: "bg-[#FFF3E0]", text: "text-[#E65100]" },
  medium: { border: "border-l-[#FFC107]", bg: "bg-[#FFFDE7]", text: "text-[#F57F17]" },
  low: { border: "border-l-[#1565C0]", bg: "bg-[#E3F2FD]", text: "text-[#0D47A1]" },
};

const TYPE_LABELS: Record<string, string> = {
  order_intelligence: "Order Intelligence",
  stock_rebalance: "Stock Rebalance",
  campaign_performance: "Campaign Performance",
};

const ACTION_LABELS: Record<string, string> = {
  send_checkin: "Check in",
  create_batch: "Create batch",
  send_reminder: "Send reminder",
  transfer_stock: "Transfer stock",
  flash_sale: "Flash sale",
  view_campaign: "View campaign",
  confirm_stock: "Confirm stock",
};

export function SuggestionCard({
  suggestion,
  onDismiss,
  onAction,
}: SuggestionCardProps) {
  const colors = PRIORITY_COLORS[suggestion.priority] || PRIORITY_COLORS.medium;
  const typeLabel = TYPE_LABELS[suggestion.type] || suggestion.type;
  const actionLabel = ACTION_LABELS[suggestion.actionType] || "View details";

  return (
    <div
      className={`relative rounded-xl bg-white border border-[#E8E8E8] border-l-4 ${colors.border} p-4 shadow-sm`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="absolute top-3 right-3 text-[#9E9E9E] hover:text-[#616161] transition-colors"
        aria-label="Dismiss suggestion"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Type badge */}
      <div className="mb-2">
        <span
          className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
        >
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-[#1A1A1A] pr-6 mb-1 leading-snug">
        {suggestion.title}
      </p>

      {/* Description */}
      <p className="text-xs text-[#757575] mb-3">{suggestion.description}</p>

      {/* Action button */}
      <button
        onClick={() => onAction(suggestion)}
        className="text-xs font-semibold text-[#1A237E] py-1.5 px-3 rounded-lg border border-[#C5CAE9] hover:bg-[#E8EAF6] transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}
