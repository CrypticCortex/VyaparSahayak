"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface AlertRow {
  id: string;
  productName: string;
  zoneName: string;
  zoneCode: string;
  stockQty: number;
  stockValue: number;
  daysIdle: number;
  expiryDays: number | null;
  riskLevel: string;
  recommendationId?: string | null;
}

interface InventoryTableProps {
  alerts: AlertRow[];
}

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-50", text: "text-red-600", label: "High" },
  medium: { bg: "bg-amber-50", text: "text-amber-600", label: "Medium" },
  watch: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Watch" },
  low: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Low" },
};

type SortKey = "productName" | "stockValue" | "daysIdle" | "riskLevel";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function InventoryTable({ alerts }: InventoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("daysIdle");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const riskOrder: Record<string, number> = { high: 0, medium: 1, watch: 2, low: 3 };

  const sorted = [...alerts].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "riskLevel") {
      cmp = (riskOrder[a.riskLevel] ?? 9) - (riskOrder[b.riskLevel] ?? 9);
    } else if (sortKey === "productName") {
      cmp = a.productName.localeCompare(b.productName);
    } else {
      cmp = (a[sortKey] as number) - (b[sortKey] as number);
    }
    return sortAsc ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    const isActive = sortKey === col;
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`ml-1 inline-block transition-transform ${
          isActive ? "text-gray-700" : "text-gray-300"
        } ${isActive && sortAsc ? "rotate-180" : ""}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1">Inventory looks clean</p>
        <p className="text-xs text-gray-500 mb-4">No at-risk items detected across any zone.</p>
        <Link
          href="/demo/alerts"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF9933] hover:text-[#e88a2d] transition-colors"
        >
          Run a scan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease }}
      className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">
          At-Risk Inventory
        </h2>
        <span className="text-xs font-semibold text-gray-400">
          {alerts.length} items
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th
                className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                onClick={() => handleSort("productName")}
              >
                Product <SortIcon col="productName" />
              </th>
              <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">
                Zone
              </th>
              <th
                className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                onClick={() => handleSort("stockValue")}
              >
                Value <SortIcon col="stockValue" />
              </th>
              <th
                className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none hidden md:table-cell"
                onClick={() => handleSort("daysIdle")}
              >
                Days Idle <SortIcon col="daysIdle" />
              </th>
              <th className="text-right px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                Expiry
              </th>
              <th
                className="text-center px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer hover:text-gray-600 select-none"
                onClick={() => handleSort("riskLevel")}
              >
                Risk <SortIcon col="riskLevel" />
              </th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((alert, i) => {
              const risk = RISK_STYLES[alert.riskLevel] || RISK_STYLES.medium;
              const valueStr =
                alert.stockValue >= 100000
                  ? (alert.stockValue / 100000).toFixed(1) + "L"
                  : alert.stockValue >= 1000
                  ? (alert.stockValue / 1000).toFixed(1) + "K"
                  : String(Math.round(alert.stockValue));

              return (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.04, duration: 0.3 }}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-900 truncate block max-w-[200px]">
                      {alert.productName}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {alert.zoneCode}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-700">
                    Rs.{valueStr}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 hidden md:table-cell">
                    {alert.daysIdle}d
                  </td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    {alert.expiryDays !== null ? (
                      <span className={alert.expiryDays < 30 ? "text-red-500 font-medium" : "text-gray-500"}>
                        {alert.expiryDays}d
                      </span>
                    ) : (
                      <span className="text-gray-300">--</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${risk.bg} ${risk.text}`}>
                      {risk.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={alert.recommendationId ? `/demo/recommendations/${alert.recommendationId}` : "/demo/alerts"}
                      className="text-xs font-semibold text-[#FF9933] hover:text-[#e88a2d] transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
