"use client";

import { motion } from "framer-motion";

function MockDashboard() {
  const categories = [
    { label: "Critical", count: 12, color: "#EF4444", width: "70%" },
    { label: "Warning", count: 28, color: "#FBBF24", width: "45%" },
    { label: "Healthy", count: 156, color: "#10B981", width: "90%" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="relative mx-auto w-full max-w-3xl"
    >
      {/* Glassmorphic frame */}
      <div
        className="rounded-2xl border border-white/[0.06] p-1"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,153,51,0.08) 0%, rgba(0,102,255,0.04) 100%)",
        }}
      >
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(8, 12, 26, 0.92)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* macOS window dots */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#E8453C]" />
                <div className="h-3 w-3 rounded-full bg-[#FBBF24]" />
                <div className="h-3 w-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-xs text-[#8892A8]">
                dashboard.vyaparsahayak.in
              </span>
            </div>
            <div className="rounded-md bg-[#10B981]/10 px-2.5 py-1">
              <span className="text-xs text-[#10B981]">Live</span>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-colors duration-200 hover:border-white/[0.08] hover:bg-white/[0.04]">
              <p className="text-xs text-[#8892A8]">Total Dead Stock</p>
              <p className="mt-1 text-2xl font-bold text-white">Rs.4.2L</p>
              <p className="mt-1 text-xs text-[#E8453C]">40 SKUs at risk</p>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-colors duration-200 hover:border-white/[0.08] hover:bg-white/[0.04]">
              <p className="text-xs text-[#8892A8]">Recovered This Month</p>
              <p className="mt-1 text-2xl font-bold text-[#10B981]">Rs.1.8L</p>
              <p className="mt-1 text-xs text-[#10B981]">+23% from last month</p>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-colors duration-200 hover:border-white/[0.08] hover:bg-white/[0.04]">
              <p className="text-xs text-[#8892A8]">Active Campaigns</p>
              <p className="mt-1 text-2xl font-bold text-[#FF9933]">7</p>
              <p className="mt-1 text-xs text-[#8892A8]">3 via WhatsApp</p>
            </div>
          </div>

          {/* Inventory health bars */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-white/80">
              Inventory Health
            </p>
            <div className="space-y-3">
              {categories.map((cat, i) => (
                <div key={cat.label} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-[#8892A8]">
                    {cat.label}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-white/5 h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: cat.width }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                      viewport={{ once: true }}
                      className="h-full rounded-full"
                      style={{ background: cat.color }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-white/60">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glow underneath */}
      <div
        className="absolute -bottom-8 left-1/2 -z-10 h-40 w-2/3 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "linear-gradient(135deg, #FF9933 0%, #0066FF 100%)",
        }}
      />
    </motion.div>
  );
}

export default function DemoSection() {
  return (
    <section
      id="demo"
      className="relative px-6 py-24"
      style={{ background: "#060B18" }}
    >
      {/* Background accent */}
      <div
        className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full opacity-10 blur-[120px]"
        style={{ background: "#FF9933" }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[#10B981]">
            See it in action
          </p>
          <h2 className="font-display mx-auto max-w-3xl text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            See how Kalyan Traders cleared{" "}
            <span className="text-[#10B981]">Rs.4.2L</span> of dead stock
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-[#8892A8] leading-relaxed">
            A real distributor in Chennai went from manual Excel tracking to
            AI-powered clearance in under a week.
          </p>
        </motion.div>

        {/* Mock dashboard */}
        <MockDashboard />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <a
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#FF9933]/25 active:scale-[0.97]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
            }}
          >
            Try Live Demo
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
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
        </motion.div>
      </div>
    </section>
  );
}
