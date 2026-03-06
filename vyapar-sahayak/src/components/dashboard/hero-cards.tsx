"use client";

import Link from "next/link";

interface HeroCardsProps {
  deadStockValue: number;
  deadStockSkuCount: number;
  clearedValue: number;
  pendingOrders?: number;
  pendingOrderValue?: number;
}

function formatLakhs(value: number): string {
  const lakhs = value / 100000;
  return lakhs.toFixed(1) + "L";
}

export function HeroCards({
  deadStockValue,
  deadStockSkuCount,
  clearedValue,
  pendingOrders = 0,
  pendingOrderValue = 0,
}: HeroCardsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
      {/* Danger card -- dead stock */}
      <div className="min-w-[260px] flex-1 rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#FFEBEE] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span className="text-xs text-[#757575] font-medium">Dead Stock Value</span>
        </div>
        <p className="text-2xl font-bold text-[#C62828] mb-1">
          Rs.{formatLakhs(deadStockValue)}
        </p>
        <p className="text-xs text-[#757575] mb-3">
          {deadStockSkuCount} SKUs at risk
        </p>
        <Link
          href="/demo/alerts"
          className="text-xs font-semibold text-[#E53935] hover:underline"
        >
          View Details →
        </Link>
      </div>

      {/* Orders card -- pending */}
      {pendingOrders > 0 && (
        <div className="min-w-[260px] flex-1 rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <span className="text-xs text-[#757575] font-medium">Pending Orders</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mb-1">
            {pendingOrders}
          </p>
          <p className="text-xs text-[#757575] mb-3">
            Rs.{formatLakhs(pendingOrderValue)} value
          </p>
          <Link
            href="/demo/orders"
            className="text-xs font-semibold text-amber-600 hover:underline"
          >
            View Orders →
          </Link>
        </div>
      )}

      {/* Success card -- cleared */}
      <div className="min-w-[260px] flex-1 rounded-xl bg-white border border-[#E8E8E8] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-xs text-[#757575] font-medium">Cleared This Week</span>
        </div>
        <p className="text-2xl font-bold text-[#2E7D32] mb-1">
          Rs.{formatLakhs(clearedValue)}
        </p>
        <p className="text-xs text-[#757575]">
          Via campaigns & offers
        </p>
      </div>
    </div>
  );
}
