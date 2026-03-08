"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// Stagger children orchestrator
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92, y: 40 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1, ease, delay: 0.4 },
  },
};

// Mock dashboard for light theme
function DashboardPreview() {
  const items = [
    { name: "Parle-G 250g", qty: 340, status: "critical", days: 12 },
    { name: "Surf Excel 1kg", qty: 180, status: "warning", days: 28 },
    { name: "Maggi 12-pack", qty: 95, status: "cleared", days: 0 },
    { name: "Vim Bar 200g", qty: 220, status: "critical", days: 8 },
    { name: "Tata Tea 500g", qty: 60, status: "cleared", days: 0 },
  ];

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Browser chrome */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="ml-3 flex-1 rounded-md bg-gray-50 px-3 py-1">
            <span className="text-[11px] text-gray-400">
              dashboard.vyaparsahayak.in
            </span>
          </div>
        </div>

        {/* Dashboard body */}
        <div className="p-5">
          {/* Summary cards */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="rounded-lg border border-red-100 bg-red-50/50 p-3"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-400">
                Dead Stock
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">Rs.4.2L</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">
                Recovered
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">Rs.1.8L</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="rounded-lg border border-orange-100 bg-orange-50/50 p-3"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#FF9933]">
                Campaigns
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900">7</p>
            </motion.div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-gray-100">
            <div className="grid grid-cols-4 gap-2 border-b border-gray-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Stuck</span>
              <span className="text-right">Status</span>
            </div>
            {items.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 1.1 + i * 0.07,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="grid grid-cols-4 gap-2 border-b border-gray-50 px-4 py-2.5 text-xs last:border-0"
              >
                <span className="truncate font-medium text-gray-700">
                  {item.name}
                </span>
                <span className="text-right text-gray-500">{item.qty}</span>
                <span className="text-right text-gray-500">
                  {item.days > 0 ? `${item.days}d` : "--"}
                </span>
                <span className="text-right">
                  {item.status === "critical" && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500 ring-1 ring-red-100"
                    >
                      At Risk
                    </motion.span>
                  )}
                  {item.status === "warning" && (
                    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 ring-1 ring-amber-100">
                      Slow
                    </span>
                  )}
                  {item.status === "cleared" && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 1.4 + i * 0.07,
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                      className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-100"
                    >
                      Cleared
                    </motion.span>
                  )}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Warm glow underneath */}
      <div className="absolute -bottom-8 left-1/2 -z-10 h-40 w-4/5 -translate-x-1/2 rounded-full bg-[#FF9933]/8 blur-3xl" />
    </div>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: dashboard moves slower than scroll
  const dashboardY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const dashboardScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-white px-6 pt-28 pb-20 lg:pt-36 lg:pb-28"
    >
      {/* Faint warm radial background */}
      <div className="absolute top-0 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[#FF9933]/[0.04] blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Text content -- centered */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="text-center"
          style={{ opacity: textOpacity }}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-6 inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF9933]/20 bg-[#FF9933]/5 px-4 py-1.5 text-xs font-medium text-[#FF9933]">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-[#FF9933]"
              />
              AI-Powered Inventory Intelligence
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            Turn dead stock into{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#FF9933]">
                recovered capital
              </span>
              {/* Animated underline */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-[#FF9933]/30"
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500"
          >
            The AI copilot Indian FMCG distributors use to detect slow-moving
            inventory, clear it fast, and recover locked capital.
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} className="mt-10">
            <motion.a
              href="/demo"
              whileHover={{ scale: 1.03, boxShadow: "0 8px 30px rgba(255,153,51,0.25)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#FF9933] px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-[#FF9933]/20"
            >
              Explore Live Demo
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Dashboard screenshot with parallax */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="show"
          style={{ y: dashboardY, scale: dashboardScale }}
          className="mt-16 lg:mt-20"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}
