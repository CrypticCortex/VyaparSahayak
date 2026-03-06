"use client";

import { useState } from "react";

interface SuggestionData {
  id: string;
  title: string;
  description: string;
  actionType: string;
  priority: string;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-gray-400",
};

export function SuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: SuggestionData;
  onDismiss?: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.(suggestion.id);
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
        aria-label="Dismiss"
      >
        x
      </button>

      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[suggestion.priority] || PRIORITY_DOT.medium}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900">{suggestion.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{suggestion.description}</p>
        </div>
      </div>
    </div>
  );
}
