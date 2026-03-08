"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface MetricsRowProps {
  deadStockValue: number;
  deadStockSkuCount: number;
  clearedValue: number;
  activeCampaigns: number;
  pendingOrders: number;
  pendingOrderValue: number;
}

function formatLakhs(value: number): string {
  if (value >= 100000) {
    return "Rs." + (value / 100000).toFixed(1) + "L";
  }
  if (value >= 1000) {
    return "Rs." + (value / 1000).toFixed(1) + "K";
  }
  return "Rs." + Math.round(value);
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const metrics = [
  {
    key: "deadStock",
    label: "Dead Stock",
    color: "#EF4444",
    bgColor: "bg-red-50",
    iconBg: "bg-red-100",
    href: "/demo/alerts",
    icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  },
  {
    key: "recovered",
    label: "Recovered",
    color: "#10B981",
    bgColor: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    href: "/demo/campaigns",
    icon: "M20 6L9 17l-5-5",
  },
  {
    key: "campaigns",
    label: "Active Campaigns",
    color: "#FF9933",
    bgColor: "bg-orange-50",
    iconBg: "bg-orange-100",
    href: "/demo/campaigns",
    icon: "M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14",
  },
  {
    key: "orders",
    label: "Pending Orders",
    color: "#3B82F6",
    bgColor: "bg-blue-50",
    iconBg: "bg-blue-100",
    href: "/demo/orders",
    icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8V2z",
  },
];

export function MetricsRow({
  deadStockValue,
  deadStockSkuCount,
  clearedValue,
  activeCampaigns,
  pendingOrders,
  pendingOrderValue,
}: MetricsRowProps) {
  const data: Record<string, { value: string; sub: string }> = {
    deadStock: {
      value: formatLakhs(deadStockValue),
      sub: `${deadStockSkuCount} SKUs at risk`,
    },
    recovered: {
      value: formatLakhs(clearedValue),
      sub: "Via campaigns & offers",
    },
    campaigns: {
      value: String(activeCampaigns),
      sub: "Running now",
    },
    orders: {
      value: String(pendingOrders),
      sub: pendingOrderValue > 0 ? formatLakhs(pendingOrderValue) + " value" : "No pending orders",
    },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, i) => {
        const d = data[metric.key];
        return (
          <motion.div
            key={metric.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease }}
          >
            <Link
              href={metric.href}
              className="block rounded-2xl bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={metric.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={metric.icon} />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {metric.label}
                </span>
              </div>
              <p
                className="text-2xl font-extrabold tracking-tight mb-0.5"
                style={{ color: metric.color }}
              >
                {d.value}
              </p>
              <p className="text-xs text-gray-500">{d.sub}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
