"use client";

import { useState } from "react";

interface BatchOrder {
  id: string;
  retailerName: string;
  totalAmount: number;
  status: string;
}

interface BatchData {
  id: string;
  zoneCode: string;
  zoneName: string;
  status: string;
  vehicleInfo: string | null;
  plannedDate: string;
  dispatchedAt: string | null;
  orderCount: number;
  totalValue: number;
  orders: BatchOrder[];
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-amber-100 text-amber-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
};

export function BatchCard({
  batch,
  onStatusChange,
}: {
  batch: BatchData;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleStatusUpdate(newStatus: string) {
    if (updating) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/orders/batch/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange?.(batch.id, newStatus);
      }
    } catch {
      // silent
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <p className="font-medium text-sm text-gray-900">{batch.zoneName}</p>
          <p className="text-xs text-gray-500">
            {batch.orderCount} orders -- Rs.{batch.totalValue.toLocaleString("en-IN")}
            {batch.vehicleInfo && ` -- ${batch.vehicleInfo}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[batch.status] || "bg-gray-100"}`}>
            {batch.status}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-2">
          {batch.orders.map((order) => (
            <div key={order.id} className="flex justify-between text-sm px-1">
              <span className="text-gray-700">{order.retailerName}</span>
              <span className="text-gray-900 font-medium">Rs.{Math.round(order.totalAmount)}</span>
            </div>
          ))}

          <div className="pt-2 border-t">
            {batch.status === "planned" && (
              <button
                onClick={() => handleStatusUpdate("dispatched")}
                disabled={updating}
                className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating ? "Updating..." : "Mark Dispatched"}
              </button>
            )}
            {batch.status === "dispatched" && (
              <button
                onClick={() => handleStatusUpdate("delivered")}
                disabled={updating}
                className="w-full py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? "Updating..." : "Mark Delivered"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
