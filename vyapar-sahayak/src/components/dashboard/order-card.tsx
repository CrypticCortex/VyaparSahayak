"use client";

import { useState } from "react";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OrderData {
  id: string;
  retailerName: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function OrderCard({
  order,
  onStatusChange,
}: {
  order: OrderData;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [updating, setUpdating] = useState("");

  async function handleAction(newStatus: string, reason?: string) {
    if (updating) return;
    setUpdating(newStatus);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (res.ok && onStatusChange) {
        onStatusChange(order.id, newStatus);
      }
    } catch {
      // revert silently
    } finally {
      setUpdating("");
    }
  }

  const timeAgo = getRelativeTime(order.createdAt);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900 text-sm">{order.retailerName}</p>
          <p className="text-xs text-gray-500">{timeAgo}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-gray-600">
            <span>{item.productName} x{item.quantity}</span>
            <span>Rs.{Math.round(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-1 border-t">
        <span className="font-semibold text-sm">Rs.{Math.round(order.totalAmount)}</span>

        {order.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("cancelled", "Rejected by distributor")}
              disabled={!!updating}
              className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {updating === "cancelled" ? "..." : "Reject"}
            </button>
            <button
              onClick={() => handleAction("confirmed")}
              disabled={!!updating}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {updating === "confirmed" ? "..." : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
