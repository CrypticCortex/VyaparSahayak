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

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-[#FF9933]/15", text: "text-[#FF9933]", dot: "bg-[#FF9933]" },
  confirmed: { bg: "bg-[#0066FF]/15", text: "text-[#0066FF]", dot: "bg-[#0066FF]" },
  dispatched: { bg: "bg-[#FF9933]/15", text: "text-[#FF9933]", dot: "bg-[#FF9933]" },
  delivered: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", dot: "bg-[#10B981]" },
  cancelled: { bg: "bg-[#E8453C]/15", text: "text-[#E8453C]", dot: "bg-[#E8453C]" },
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
  const statusStyle = STATUS_STYLES[order.status] || { bg: "bg-white/[0.04]", text: "text-[#8892A8]", dot: "bg-[#8892A8]" };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5 hover:border-white/[0.10] transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white text-sm">{order.retailerName}</p>
          <p className="text-[11px] text-[#8892A8]/70 mt-0.5">{timeAgo}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {order.status}
        </span>
      </div>

      <div className="space-y-1.5 py-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-[#8892A8]">{item.productName} <span className="text-[#8892A8]/70">x{item.quantity}</span></span>
            <span className="text-white font-medium">Rs.{Math.round(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
        <span className="font-bold text-sm text-white">Rs.{Math.round(order.totalAmount).toLocaleString("en-IN")}</span>

        {order.status === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("cancelled", "Rejected by distributor")}
              disabled={!!updating}
              className="px-3 py-1.5 text-xs font-bold text-[#E8453C] border border-[#E8453C]/30 rounded-xl hover:bg-[#E8453C]/10 active:scale-[0.97] disabled:opacity-50 transition-all"
            >
              {updating === "cancelled" ? "..." : "Reject"}
            </button>
            <button
              onClick={() => handleAction("confirmed")}
              disabled={!!updating}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#FF9933] rounded-xl hover:bg-[#FF9933]/80 active:scale-[0.97] disabled:opacity-50 transition-all"
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
