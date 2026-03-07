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

const PRIORITY_STYLES: Record<string, { border: string; accent: string; bg: string; text: string }> = {
  high: { border: "border-l-[#FF9933]", accent: "bg-[#FF9933]", bg: "bg-[#FF9933]/15", text: "text-[#FF9933]" },
  medium: { border: "border-l-[#E8453C]", accent: "bg-[#E8453C]", bg: "bg-[#E8453C]/15", text: "text-[#E8453C]" },
  low: { border: "border-l-[#0066FF]", accent: "bg-[#0066FF]", bg: "bg-[#0066FF]/15", text: "text-[#0066FF]" },
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

const ACTION_ICONS: Record<string, string> = {
  send_checkin: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
  create_batch: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M12 11v6 M9 14h6",
  send_reminder: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  transfer_stock: "M5 12h14 M12 5l7 7-7 7",
  flash_sale: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  view_campaign: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  confirm_stock: "M20 6L9 17l-5-5",
};

export function SuggestionCard({
  suggestion,
  onDismiss,
  onAction,
}: SuggestionCardProps) {
  const style = PRIORITY_STYLES[suggestion.priority] || PRIORITY_STYLES.medium;
  const typeLabel = TYPE_LABELS[suggestion.type] || suggestion.type;
  const actionLabel = ACTION_LABELS[suggestion.actionType] || "View details";
  const actionIcon = ACTION_ICONS[suggestion.actionType] || ACTION_ICONS.confirm_stock;

  return (
    <div
      className={`relative rounded-2xl bg-white/[0.03] border border-white/[0.06] border-l-2 ${style.border} p-4 transition-all duration-200`}
    >
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[#8892A8] hover:text-white transition-all"
        aria-label="Dismiss suggestion"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Type badge */}
      <div className="mb-2.5">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.accent}`} />
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-white pr-8 mb-1 leading-snug">
        {suggestion.title}
      </p>

      {/* Description */}
      <p className="text-xs text-[#8892A8] mb-3 leading-relaxed">{suggestion.description}</p>

      {/* Action button */}
      <button
        onClick={() => onAction(suggestion)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-white py-2 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.10] active:scale-[0.98] transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={actionIcon} />
        </svg>
        {actionLabel}
      </button>
    </div>
  );
}
