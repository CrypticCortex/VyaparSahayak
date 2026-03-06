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
    // optimistic removal
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

    // navigate based on actionType
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
      case "transfer_stock":
      case "flash_sale":
      default:
        // show the action was noted -- these would normally trigger real actions
        break;
    }

    // mark as acted
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
      <div className="space-y-3 mb-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-white border border-[#E8E8E8] p-4 animate-pulse"
          >
            <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  const visible = showAll ? suggestions : suggestions.slice(0, maxVisible);
  const remaining = suggestions.length - maxVisible;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B1FA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h2 className="text-sm font-semibold text-[#7B1FA2]">
          Agent Suggestions
        </h2>
        <span className="text-xs text-[#9E9E9E]">
          ({suggestions.length})
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
          className="w-full text-center text-xs font-semibold text-[#1A237E] py-2 rounded-lg border border-[#C5CAE9] hover:bg-[#E8EAF6] transition-colors"
        >
          Show {remaining} more suggestion{remaining !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
