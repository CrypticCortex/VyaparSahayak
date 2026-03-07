"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

const painPoints = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 2v4M14 22v4M4.93 4.93l2.83 2.83M20.24 20.24l2.83 2.83M2 14h4M22 14h4M4.93 23.07l2.83-2.83M20.24 7.76l2.83-2.83"
          stroke="#FF6B6B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="14" cy="14" r="5" stroke="#FF6B6B" strokeWidth="2" />
      </svg>
    ),
    title: "Products approaching expiry, no automated alerts",
    description:
      "By the time you notice, it's too late. Goods expire on shelves while you're busy managing day-to-day operations. Lakhs lost every quarter.",
    color: "#E8453C",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect
          x="3"
          y="6"
          width="22"
          height="16"
          rx="2"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <path d="M3 12h22" stroke="#FBBF24" strokeWidth="2" />
        <path
          d="M7 17h6"
          stroke="#FBBF24"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Capital locked in unsellable inventory",
    description:
      "Dead stock ties up your working capital. You can't reorder fast-moving items because your money is stuck in products gathering dust.",
    color: "#FF9933",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect
          x="4"
          y="3"
          width="20"
          height="22"
          rx="2"
          stroke="#60A5FA"
          strokeWidth="2"
        />
        <path
          d="M9 8h10M9 12h10M9 16h6"
          stroke="#60A5FA"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 18l4 4"
          stroke="#FF6B6B"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Manual Excel tracking breaks at scale",
    description:
      "You started with a spreadsheet. Now you have 500+ SKUs across multiple warehouses, and Excel just can't keep up. Errors multiply daily.",
    color: "#0066FF",
  },
];

export default function ProblemSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{ background: "#060B18" }}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header -- left-aligned, editorial style */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#FF9933]">
            The Problem
          </p>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl md:text-6xl text-left">
            <span className="text-gradient-warm">Sound</span> familiar?
          </h2>
        </motion.div>

        {/* Horizontal scroll container with fade masks */}
        <div className="relative">
          {/* Left fade mask */}
          <div
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 sm:w-20"
            style={{
              background:
                "linear-gradient(to right, #060B18 0%, transparent 100%)",
            }}
          />
          {/* Right fade mask */}
          <div
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 sm:w-20"
            style={{
              background:
                "linear-gradient(to left, #060B18 0%, transparent 100%)",
            }}
          />

          <div
            ref={scrollRef}
            className="hide-scrollbar flex gap-6 overflow-x-auto px-2 pb-4 snap-x snap-mandatory"
          >
            {painPoints.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
                className="relative min-w-[80vw] sm:min-w-[300px] md:min-w-[360px] flex-shrink-0 snap-center rounded-2xl border border-white/[0.04] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                {/* Giant watermark number */}
                <span
                  className="font-display absolute -top-4 right-4 select-none text-[120px] font-bold leading-none opacity-[0.03] text-white"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Card content */}
                <div className="relative z-10 p-8">
                  {/* Icon container */}
                  <div
                    className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: `${point.color}14` }}
                  >
                    {point.icon}
                  </div>

                  <h3 className="mb-3 text-lg font-semibold text-white">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#8892A8]">
                    {point.description}
                  </p>
                </div>

                {/* Colored bottom border line */}
                <div
                  className="h-[2px] w-full"
                  style={{ background: point.color }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
