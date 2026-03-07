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
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white tracking-tight">
          Dead Stock Trend
        </h2>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isDown
            ? "bg-[#10B981]/15 text-[#10B981]"
            : "bg-[#E8453C]/15 text-[#E8453C]"
        }`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={isDown ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
          {Math.abs(delta).toFixed(0)}%
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="deadStockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9933" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FF9933" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#8892A8", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8892A8", fontWeight: 500 }}
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
                background: "#0A1128",
                color: "#FAFAFA",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
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
              activeDot={{ r: 5, fill: "#FF9933", stroke: "#060B18", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
