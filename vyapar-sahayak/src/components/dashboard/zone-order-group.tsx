"use client";

import { useState } from "react";
import { OrderCard } from "./order-card";

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

export function ZoneOrderGroup({
  zoneName,
  zoneCode,
  orders: initialOrders,
  totalValue,
  defaultExpanded = false,
}: {
  zoneName: string;
  zoneCode: string;
  orders: OrderData[];
  totalValue: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [orders, setOrders] = useState(initialOrders);
  const [creatingBatch, setCreatingBatch] = useState(false);

  const confirmedOrders = orders.filter((o) => o.status === "confirmed");
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  function handleStatusChange(orderId: string, newStatus: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  async function handleCreateBatch() {
    if (creatingBatch || confirmedOrders.length === 0) return;
    setCreatingBatch(true);

    try {
      const res = await fetch("/api/orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneCode,
          orderIds: confirmedOrders.map((o) => o.id),
        }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            confirmedOrders.some((c) => c.id === o.id)
              ? { ...o, status: "dispatched" }
              : o
          )
        );
      }
    } catch {
      // silent fail
    } finally {
      setCreatingBatch(false);
    }
  }

  return (
    <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-white/[0.02] to-white/[0.03] hover:from-white/[0.04] hover:to-white/[0.05] transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FF9933]/15 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="text-left">
            <span className="font-bold text-sm text-white">{zoneName}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-[#8892A8]/70 uppercase">{zoneCode}</span>
              <span className="text-[10px] text-[#8892A8]/70">*</span>
              <span className="text-[10px] font-medium text-[#8892A8]">
                {orders.length} orders
              </span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-bold text-[#FF9933] bg-[#FF9933]/15 px-1.5 py-0.5 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">
            Rs.{Math.round(totalValue).toLocaleString("en-IN")}
          </span>
          <svg
            className={`w-4 h-4 text-[#8892A8] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-3 space-y-2.5 border-t border-white/[0.06] bg-white/[0.02]">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))}

          {confirmedOrders.length > 0 && (
            <button
              onClick={handleCreateBatch}
              disabled={creatingBatch}
              className="w-full py-2.5 text-sm font-bold text-white bg-[#FF9933] rounded-xl hover:bg-[#FF9933]/80 active:scale-[0.99] disabled:opacity-50 transition-all mt-1"
            >
              {creatingBatch
                ? "Creating batch..."
                : `Create Dispatch Batch (${confirmedOrders.length} orders)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
