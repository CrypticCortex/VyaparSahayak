"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Animated arrow that pulses data flow
function Arrow({ direction = "down", delay = 0 }: { direction?: "down" | "right"; delay?: number }) {
  const isDown = direction === "down";
  return (
    <div className={`flex ${isDown ? "justify-center py-1" : "items-center px-1"}`}>
      <motion.svg
        width={isDown ? "12" : "24"}
        height={isDown ? "24" : "12"}
        viewBox={isDown ? "0 0 12 24" : "0 0 24 12"}
        fill="none"
        className="text-gray-300"
      >
        {isDown ? (
          <motion.path
            d="M6 0v18M2 14l4 5 4-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ pathLength: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay }}
          />
        ) : (
          <motion.path
            d="M0 6h18M14 2l5 4-5 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ pathLength: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay }}
          />
        )}
      </motion.svg>
    </div>
  );
}

// Single box in the diagram
function DiagramBox({
  label,
  sub,
  color,
  delay,
  size = "normal",
}: {
  label: string;
  sub?: string;
  color: string;
  delay: number;
  size?: "normal" | "small" | "large";
}) {
  const sizeClasses = {
    small: "px-3 py-2",
    normal: "px-4 py-3",
    large: "px-5 py-4",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease }}
      whileHover={{ scale: 1.04, y: -2 }}
      className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${sizeClasses[size]}`}
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-bold text-gray-800">{label}</span>
      </div>
      {sub && (
        <p className="mt-1 pl-4 text-[10px] leading-tight text-gray-400">{sub}</p>
      )}
    </motion.div>
  );
}

// Group label
function GroupLabel({ label, color, delay }: { label: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4, ease }}
      className="mb-2 flex items-center gap-2"
    >
      <div className="h-3 w-1 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
        {label}
      </span>
    </motion.div>
  );
}

export default function ArchitectureSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="bg-gray-50 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            System Architecture
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-gray-500">
            From raw inventory to cleared dead stock -- every layer of the pipeline.
          </p>
        </motion.div>

        {/* === THE DIAGRAM === */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">

          {/* Row 1: User-facing layer */}
          <GroupLabel label="Frontend" color="#FF9933" delay={0.1} />
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DiagramBox label="Landing Page" sub="Next.js 16 SSR" color="#FF9933" delay={0.15} />
            <DiagramBox label="Dashboard" sub="Real-time KPIs" color="#FF9933" delay={0.2} />
            <DiagramBox label="Chat Interface" sub="Agentic AI copilot" color="#FF9933" delay={0.25} />
            <DiagramBox label="Order Portal" sub="Retailer self-serve" color="#FF9933" delay={0.3} />
          </div>

          <Arrow delay={0} />

          {/* Row 2: API + Agent layer */}
          <GroupLabel label="AI Agent Layer" color="#6366F1" delay={0.35} />
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DiagramBox label="Strands Agent" sub="19 tools, intent routing" color="#6366F1" delay={0.4} size="large" />
            <DiagramBox label="AWS Bedrock" sub="Nova Lite + Nova Canvas" color="#6366F1" delay={0.45} size="large" />
            <DiagramBox label="Google Gemini" sub="Alternate poster gen" color="#6366F1" delay={0.5} size="large" />
          </div>

          {/* Sub-tools row */}
          <div className="mb-2 ml-4 flex flex-wrap gap-2 border-l-2 border-indigo-100 pl-4">
            {[
              "scan_inventory", "get_alerts", "generate_recommendation",
              "send_campaign", "auto_handle_dead_stock", "confirm_order",
              "create_dispatch_batch", "get_network_overview",
            ].map((tool, i) => (
              <motion.span
                key={tool}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55 + i * 0.03, duration: 0.3 }}
                className="rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-mono font-medium text-indigo-500"
              >
                {tool}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-mono text-indigo-400"
            >
              +11 more
            </motion.span>
          </div>

          <Arrow delay={0.3} />

          {/* Row 3: ML Pipeline */}
          <GroupLabel label="ML Pipeline" color="#10B981" delay={0.6} />
          <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
            <DiagramBox label="Feature Extraction" sub="19 signals / SKU" color="#10B981" delay={0.65} />
            <Arrow direction="right" delay={0.5} />
            <DiagramBox label="Weighted Scoring" sub="6 weighted signals" color="#10B981" delay={0.7} />
            <Arrow direction="right" delay={0.6} />
            <DiagramBox label="Risk Classification" sub="HIGH / MEDIUM / WATCH" color="#10B981" delay={0.75} />
            <Arrow direction="right" delay={0.7} />
            <DiagramBox label="Recommendations" sub="Reallocate / Bundle / Discount" color="#10B981" delay={0.8} />
          </div>

          {/* Scoring weights mini-bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.85 }}
            className="mb-2 ml-4 flex items-center gap-1 border-l-2 border-emerald-100 pl-4"
          >
            <span className="mr-1 text-[9px] font-medium text-gray-400">Weights:</span>
            {[
              { label: "Idle", w: 28 },
              { label: "Velocity", w: 22 },
              { label: "Overstock", w: 20 },
              { label: "Expiry", w: 18 },
              { label: "Season", w: 8 },
              { label: "Returns", w: 4 },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-0.5">
                <div
                  className="h-1.5 rounded-full bg-emerald-400"
                  style={{ width: `${s.w * 1.5}px` }}
                />
                <span className="text-[8px] text-gray-400">{s.label} {s.w}%</span>
              </div>
            ))}
          </motion.div>

          <Arrow delay={0.6} />

          {/* Row 4: Data Layer */}
          <GroupLabel label="Data Layer" color="#0EA5E9" delay={0.9} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DiagramBox label="Turso" sub="LibSQL, India region" color="#0EA5E9" delay={0.95} />
            <DiagramBox label="Prisma ORM" sub="16 models, type-safe" color="#0EA5E9" delay={1.0} />
            <DiagramBox label="Next.js Cache" sub="Tag-based invalidation" color="#0EA5E9" delay={1.05} />
            <DiagramBox label="AWS Amplify" sub="SSR compute + CDN" color="#0EA5E9" delay={1.1} />
          </div>

          {/* External services row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.15, duration: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-4 border-t border-dashed border-gray-200 pt-5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Integrations
            </span>
            {[
              { name: "WhatsApp Groups", color: "#25D366" },
              { name: "Campaign Posters", color: "#FF9933" },
              { name: "Retailer Ordering", color: "#6366F1" },
              { name: "Dispatch Batching", color: "#0EA5E9" },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: svc.color }} />
                <span className="text-[10px] font-medium text-gray-500">{svc.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
