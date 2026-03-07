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
  if (value >= 100000) {
    return (value / 100000).toFixed(1) + "L";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
  }
  return Math.round(value).toString();
}

export function HeroCards({
  deadStockValue,
  deadStockSkuCount,
  clearedValue,
  pendingOrders = 0,
  pendingOrderValue = 0,
}: HeroCardsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
      {/* Dead stock card */}
      <div className="min-w-[240px] flex-1 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 snap-start border-l-2 border-l-[#E8453C]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8453C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase text-[#E8453C]/80">Dead Stock</span>
        </div>
        <p className="text-3xl font-extrabold tracking-tight font-display text-[#E8453C] mb-0.5">
          Rs.{formatLakhs(deadStockValue)}
        </p>
        <p className="text-xs text-[#8892A8] mb-3">
          {deadStockSkuCount} SKUs at risk
        </p>
        <Link
          href="/demo/alerts"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#E8453C] hover:opacity-80 transition-colors group"
        >
          View Details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Pending orders card */}
      {pendingOrders > 0 && (
        <div className="min-w-[240px] flex-1 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 snap-start border-l-2 border-l-[#FF9933]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase text-[#FF9933]/80">Pending</span>
          </div>
          <p className="text-3xl font-extrabold tracking-tight font-display text-[#FF9933] mb-0.5">
            {pendingOrders}
          </p>
          <p className="text-xs text-[#8892A8] mb-3">
            Rs.{formatLakhs(pendingOrderValue)} value
          </p>
          <Link
            href="/demo/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#FF9933] hover:opacity-80 transition-colors group"
          >
            View Orders
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      )}

      {/* Cleared card */}
      <div className="min-w-[240px] flex-1 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 snap-start border-l-2 border-l-[#10B981]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase text-[#10B981]/80">Cleared</span>
        </div>
        <p className="text-3xl font-extrabold tracking-tight font-display text-[#10B981] mb-0.5">
          Rs.{formatLakhs(clearedValue)}
        </p>
        <p className="text-xs text-[#8892A8]">
          Via campaigns & offers
        </p>
      </div>
    </div>
  );
}
