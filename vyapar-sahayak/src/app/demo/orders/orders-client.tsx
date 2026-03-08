"use client";

import { useState } from "react";
import Link from "next/link";
import { ZoneOrderGroup } from "@/components/dashboard/zone-order-group";
import { SuggestionCard } from "@/components/dashboard/suggestion-card";

interface ZoneGroup {
  zoneCode: string;
  zoneName: string;
  orderCount: number;
  totalValue: number;
  orders: any[];
}

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  actionType: string;
  actionPayload: string;
  priority: string;
}

export function OrdersClient({
  zoneGroups,
  pendingCount,
  todayValue,
  suggestions: initialSuggestions,
}: {
  zoneGroups: ZoneGroup[];
  pendingCount: number;
  todayValue: number;
  suggestions: Suggestion[];
}) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);

  function handleDismiss(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    }).catch(() => {});
  }

  function handleAction(suggestion: Suggestion) {
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(suggestion.actionPayload); } catch {}

    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    fetch(`/api/suggestions/${suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "acted" }),
    }).catch(() => {});

    switch (suggestion.actionType) {
      case "create_batch": {
        const el = document.getElementById(`zone-${payload.zoneCode}`);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        break;
      }
      case "send_checkin":
      case "send_reminder":
        alert(`${suggestion.title}\n\nWhatsApp check-in would be sent in production.`);
        break;
      default:
        break;
    }
  }
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Orders</h1>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white border border-[#FF9933]/30 rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#FF9933]">{pendingCount}</p>
          <p className="text-xs text-[#FF9933]">Pending</p>
        </div>
        <div className="flex-1 bg-white border border-[#3B82F6]/30 rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#3B82F6]">
            Rs.{todayValue.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-[#3B82F6]">Total Value</p>
        </div>
        <Link
          href="/demo/orders/batches"
          className="flex-1 bg-white border border-[#FF9933]/30 rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-lg font-bold text-[#FF9933]">Batches</p>
          <p className="text-xs text-[#FF9933]">View All</p>
        </Link>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onDismiss={handleDismiss}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Zone groups */}
      <div className="space-y-3">
        {zoneGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          zoneGroups.map((group, i) => (
            <ZoneOrderGroup
              key={group.zoneCode}
              zoneName={group.zoneName}
              zoneCode={group.zoneCode}
              orders={group.orders}
              totalValue={group.totalValue}
              defaultExpanded={i < 2}
            />
          ))
        )}
      </div>
    </div>
  );
}
