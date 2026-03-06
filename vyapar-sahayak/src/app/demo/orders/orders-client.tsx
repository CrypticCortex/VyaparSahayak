"use client";

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
  suggestions,
}: {
  zoneGroups: ZoneGroup[];
  pendingCount: number;
  todayValue: number;
  suggestions: Suggestion[];
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="px-4">
        <h1 className="text-lg font-bold text-gray-900">Orders</h1>
      </div>

      {/* Summary bar */}
      <div className="px-4 flex gap-3">
        <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">
            Rs.{todayValue.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-blue-600">Total Value</p>
        </div>
        <Link
          href="/demo/orders/batches"
          className="flex-1 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center hover:bg-indigo-100 transition-colors"
        >
          <p className="text-lg font-bold text-indigo-700">Batches</p>
          <p className="text-xs text-indigo-600">View All</p>
        </Link>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 space-y-2">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onDismiss={() => {}}
              onAction={() => {}}
            />
          ))}
        </div>
      )}

      {/* Zone groups */}
      <div className="px-4 space-y-3">
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
