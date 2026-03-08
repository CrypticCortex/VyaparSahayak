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
  plannedDate: string | null;
  dispatchedAt: string | null;
  orderCount: number;
  totalValue: number;
  orders: BatchOrder[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  planned: { bg: "bg-[#FF9933]/15", text: "text-[#FF9933]", dot: "bg-[#FF9933]" },
  dispatched: { bg: "bg-[#FF9933]/15", text: "text-[#FF9933]", dot: "bg-[#FF9933]" },
  delivered: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", dot: "bg-[#10B981]" },
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

  const statusStyle = STATUS_STYLES[batch.status] || { bg: "bg-white/[0.04]", text: "text-[#8892A8]", dot: "bg-[#8892A8]" };

  return (
    <div className="border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.10] transition-shadow duration-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-white">{batch.zoneName}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {batch.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8892A8]">
            <span>{batch.orderCount} orders</span>
            <span className="text-white/20">*</span>
            <span className="font-semibold text-white">Rs.{batch.totalValue.toLocaleString("en-IN")}</span>
            {batch.vehicleInfo && (
              <>
                <span className="text-white/20">*</span>
                <span>{batch.vehicleInfo}</span>
              </>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[#8892A8] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] p-3.5 space-y-2 bg-white/[0.02]">
          {batch.orders.map((order) => (
            <div key={order.id} className="flex justify-between text-sm px-1 py-1">
              <span className="text-[#8892A8]">{order.retailerName}</span>
              <span className="text-white font-semibold">Rs.{Math.round(order.totalAmount).toLocaleString("en-IN")}</span>
            </div>
          ))}

          <div className="pt-2.5 border-t border-white/[0.06]">
            {batch.status === "planned" && (
              <button
                onClick={() => handleStatusUpdate("dispatched")}
                disabled={updating}
                className="w-full py-2.5 text-sm font-bold text-white bg-[#FF9933] rounded-xl hover:bg-[#FF9933]/80 active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                {updating ? "Updating..." : "Mark Dispatched"}
              </button>
            )}
            {batch.status === "dispatched" && (
              <button
                onClick={() => handleStatusUpdate("delivered")}
                disabled={updating}
                className="w-full py-2.5 text-sm font-bold text-white bg-[#10B981] rounded-xl hover:bg-[#10B981]/80 active:scale-[0.99] disabled:opacity-50 transition-all"
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
