"use client";

import { useEffect, useState } from "react";
import { SuggestionCard } from "./suggestion-card";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  actionType: string;
  actionPayload: string;
  priority: string;
}

interface SuggestionListProps {
  maxVisible?: number;
}

export function SuggestionList({ maxVisible = 5 }: SuggestionListProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data.suggestions || []);
      })
      .catch(() => {
        // silently fail -- no suggestions is fine
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDismiss(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));

    try {
      await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
    } catch {
      // ignore -- optimistic is sufficient for demo
    }
  }

  async function handleAction(suggestion: Suggestion) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(suggestion.actionPayload);
    } catch {
      // fallback to empty
    }

    switch (suggestion.actionType) {
      case "create_batch":
        window.location.href = `/demo/orders?zone=${payload.zoneCode || ""}`;
        break;
      case "view_campaign":
        window.location.href = `/demo/campaigns/${payload.campaignId || ""}`;
        break;
      case "confirm_stock":
        window.location.href = `/demo/orders`;
        break;
      case "send_checkin":
      case "send_reminder":
        alert(`${suggestion.title}\n\nWhatsApp message would be sent in production.`);
        break;
      case "transfer_stock":
        alert(`${suggestion.title}\n\nStock transfer would be initiated in production.`);
        break;
      case "flash_sale":
        window.location.href = `/demo/alerts`;
        break;
      default:
        break;
    }

    try {
      await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acted" }),
      });
    } catch {
      // ignore
    }

    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }

  if (loading) {
    return (
      <div className="px-4 space-y-3 mb-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 animate-pulse"
          >
            <div className="h-4 bg-white/[0.06] rounded-full w-28 mb-3" />
            <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/[0.06] rounded w-1/2 mb-3" />
            <div className="h-8 bg-white/[0.06] rounded-xl w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  const visible = showAll ? suggestions : suggestions.slice(0, maxVisible);
  const remaining = suggestions.length - maxVisible;

  return (
    <div className="px-4 space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#FF9933]/15 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-white tracking-tight">
          Agent Suggestions
        </h2>
        <span className="text-[10px] font-bold text-[#FF9933] bg-[#FF9933]/15 px-2 py-0.5 rounded-full">
          {suggestions.length}
        </span>
      </div>

      {visible.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onDismiss={handleDismiss}
          onAction={handleAction}
        />
      ))}

      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-xs font-bold text-[#FF9933] py-2.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] active:scale-[0.99] transition-all"
        >
          Show {remaining} more suggestion{remaining !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
