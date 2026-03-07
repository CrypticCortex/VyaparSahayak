"use client";

import { motion } from "framer-motion";

// Mock dashboard card showing dead stock items
function DashboardPreview() {
  const items = [
    { name: "Parle-G 250g", qty: 340, status: "critical", days: 12 },
    { name: "Surf Excel 1kg", qty: 180, status: "warning", days: 28 },
    { name: "Maggi 12-pack", qty: 95, status: "recovered", days: 0 },
    { name: "Vim Bar 200g", qty: 220, status: "critical", days: 8 },
    { name: "Tata Tea 500g", qty: 60, status: "recovered", days: 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -6 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
      className="relative w-full"
      style={{ perspective: "1200px" }}
    >
      {/* Gradient border wrapper */}
      <div
        className="rounded-2xl p-px"
        style={{
          background:
            "linear-gradient(160deg, rgba(255,153,51,0.4) 0%, rgba(255,255,255,0.06) 40%, rgba(0,102,255,0.3) 100%)",
        }}
      >
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(8,12,26,0.92)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Dashboard header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </div>
              <span className="text-[11px] text-white/30">
                dashboard.vyaparsahayak.in
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">
                Live
              </span>
            </div>
          </div>

          {/* Summary row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Dead Stock</p>
              <p className="mt-0.5 text-lg font-bold text-white">Rs.4.2L</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Recovered</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-400">Rs.1.8L</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Campaigns</p>
              <p className="mt-0.5 text-lg font-bold text-[#FF9933]">7</p>
            </div>
          </div>

          {/* Table header */}
          <div className="mb-1.5 grid grid-cols-4 gap-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
            <span>Product</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Stuck</span>
            <span className="text-right">Status</span>
          </div>

          {/* Table rows */}
          {items.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.08 }}
              className="grid grid-cols-4 gap-2 border-t border-white/[0.04] py-2 text-xs"
            >
              <span className="truncate text-white/80">{item.name}</span>
              <span className="text-right text-white/50">{item.qty}</span>
              <span className="text-right text-white/50">
                {item.days > 0 ? `${item.days}d` : "--"}
              </span>
              <span className="text-right">
                {item.status === "critical" && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400"
                  >
                    At Risk
                  </motion.span>
                )}
                {item.status === "warning" && (
                  <span className="inline-block rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                    Slow
                  </span>
                )}
                {item.status === "recovered" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 1.2 + i * 0.08 }}
                    className="inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400"
                  >
                    Cleared
                  </motion.span>
                )}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Glow underneath */}
      <div
        className="absolute -bottom-6 left-1/2 -z-10 h-32 w-3/4 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background: "linear-gradient(135deg, #FF9933 0%, #0066FF 100%)",
        }}
      />
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-28 pb-16 lg:pt-36 lg:pb-24">
      {/* Background gradient orbs */}
      <div
        className="absolute top-0 -left-60 h-[600px] w-[600px] rounded-full opacity-15 blur-[140px]"
        style={{ background: "#FF9933" }}
      />
      <div
        className="absolute top-20 -right-40 h-[500px] w-[500px] rounded-full opacity-10 blur-[130px]"
        style={{ background: "#0066FF" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Split layout: text left, dashboard right */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Text content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#FF9933]/20 bg-[#FF9933]/5 px-4 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-pulse" />
              <span className="text-xs text-[#FF9933]">
                Built for Indian FMCG distributors
              </span>
            </motion.div>

            {/* Staggered headline - serif */}
            <div className="space-y-1">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Your dead stock
                </h1>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <span className="font-display text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl text-gradient-warm">
                  is bleeding you
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <span className="font-display text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  dry.
                </span>
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 max-w-md text-lg leading-relaxed text-[#8892A8]"
            >
              AI-powered inventory intelligence that detects dead stock early,
              clears it fast, and recovers your capital -- before it&apos;s too late.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="/demo"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#FF9933]/20 active:scale-[0.97]"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
                }}
              >
                Try Live Demo
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-[#FF9933]"
                >
                  <path d="M3 2l11 6-11 6V2z" fill="currentColor" />
                </svg>
                Watch 2-min Demo
              </a>
            </motion.div>

            {/* Social proof chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="mt-12 flex flex-wrap items-center gap-6 text-xs text-white/40"
            >
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Rs.40L+ recovered
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#FF9933]" />
                3 days avg setup
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#0066FF]" />
                91% ROI in 60 days
              </div>
            </motion.div>
          </div>

          {/* Right: Dashboard preview */}
          <div className="relative">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
