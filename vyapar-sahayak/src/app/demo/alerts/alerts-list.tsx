"use client";

import { useState } from "react";
import { ProductCard } from "@/components/dashboard/product-card";

interface AlertData {
  id: string;
  productName: string;
  stockValue: number;
  daysSinceLastSale: number;
  daysToExpiry: number;
  riskLevel: string;
  recommendationType: string | null;
  recommendationJson: string | null;
}

interface AlertsListProps {
  alerts: AlertData[];
}

const filterChips = [
  { key: "all", label: "All" },
  { key: "near_expiry", label: "Near Expiry" },
  { key: "slow_moving", label: "Slow Moving" },
  { key: "excess", label: "Excess" },
  { key: "dead_stock", label: "Dead Stock" },
] as const;

type FilterKey = (typeof filterChips)[number]["key"];

export function AlertsList({ alerts }: AlertsListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = alerts.filter((alert) => {
    if (activeFilter === "all") return true;
    // Near expiry: batch expiring soon regardless of sales velocity
    if (activeFilter === "near_expiry") return alert.daysToExpiry > 0 && alert.daysToExpiry < 45;
    // Dead stock: no movement for 60+ days
    if (activeFilter === "dead_stock") return alert.daysSinceLastSale >= 60;
    // Slow moving: some recent sales but declining (not dead, not near expiry)
    if (activeFilter === "slow_moving") return alert.daysSinceLastSale >= 15 && alert.daysSinceLastSale < 60 && alert.daysToExpiry >= 45;
    // Excess: overstocked but still selling (low idle days, recommendation is bundle/price_off/monitor)
    if (activeFilter === "excess") return alert.daysSinceLastSale < 15;
    return true;
  });

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilter(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === chip.key
                ? "bg-[#FF9933] text-white"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Product cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No items match this filter.</p>
          </div>
        ) : (
          filtered.map((alert) => (
            <ProductCard
              key={alert.id}
              alertId={alert.id}
              productName={alert.productName}
              stockValue={alert.stockValue}
              daysSinceLastSale={alert.daysSinceLastSale}
              daysToExpiry={alert.daysToExpiry}
              riskLevel={alert.riskLevel}
              recommendationType={alert.recommendationType}
              recommendationJson={alert.recommendationJson}
            />
          ))
        )}
      </div>
    </>
  );
}
