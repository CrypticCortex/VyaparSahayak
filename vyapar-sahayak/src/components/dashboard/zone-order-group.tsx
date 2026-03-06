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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">{zoneName}</span>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {orders.length} orders
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            Rs.{Math.round(totalValue).toLocaleString("en-IN")}
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
        <div className="p-3 space-y-2">
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
              className="w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 mt-2"
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
