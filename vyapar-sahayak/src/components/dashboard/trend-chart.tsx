"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: { week: string; value: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  const latestValue = data.length > 0 ? data[data.length - 1].value : 0;
  const previousValue = data.length > 1 ? data[data.length - 2].value : latestValue;
  const delta = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;
  const isDown = delta <= 0;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight">
          Dead Stock Trend
        </h2>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isDown
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-red-600"
        }`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={isDown ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
          {Math.abs(delta).toFixed(0)}%
        </div>
      </div>
      <div className="p-4 lg:p-5">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="deadStockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9933" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#FF9933" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v / 100000).toFixed(1) + "L"}
            />
            <Tooltip
              formatter={(value: number | undefined) => [
                "Rs." + ((value ?? 0) / 100000).toFixed(1) + "L",
                "Dead Stock",
              ]}
              contentStyle={{
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 12,
                background: "#FFFFFF",
                color: "#111827",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                padding: "8px 12px",
              }}
              cursor={{ stroke: "#FF9933", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#FF9933"
              strokeWidth={2.5}
              fill="url(#deadStockGradient)"
              dot={{ r: 3, fill: "#FF9933", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#FF9933", stroke: "#FFFFFF", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
