"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Connect your billing software",
    description:
      "Seamless integration with Tally, Busy, and other popular Indian billing platforms. No data migration headaches.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI scans and flags dead stock by risk tier",
    description:
      "Our algorithms analyze movement velocity, expiry dates, seasonal patterns, and regional demand to classify every SKU.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Smart clearance campaigns auto-launch",
    description:
      "Targeted discounts, redistribution to high-demand areas, and WhatsApp campaigns to clear stock before it expires.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const stepColors = ["#FF9933", "#0066FF", "#E8453C"];

export default function SolutionSteps() {
  return (
    <section
      className="relative px-6 py-32"
      style={{ backgroundColor: "#060B18" }}
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[160px]"
        style={{ background: "#0066FF" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full opacity-[0.04] blur-[140px]"
        style={{ background: "#FF9933" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#0066FF]">
            How it works
          </p>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            Three steps to{" "}
            <span className="text-gradient-warm">reclaim your capital</span>
          </h2>
        </motion.div>

        {/* Steps -- deconstructed editorial layout */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.number}>
              {/* Separator line (before every step except the first) */}
              {i > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="h-px w-full origin-left border-white/[0.04] bg-white/[0.04]"
                />
              )}

              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true, margin: "-80px" }}
                className={`flex flex-col items-center gap-8 py-12 md:flex-row md:gap-16 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Giant step number */}
                <div className="flex shrink-0 items-center justify-center md:w-1/3">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 0.5, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="font-display select-none text-[80px] font-bold leading-none text-gradient-warm opacity-50 lg:text-[120px]"
                  >
                    {step.number}
                  </motion.span>
                </div>

                {/* Content card */}
                <motion.div
                  initial={{ opacity: 0, x: i % 2 === 0 ? 24 : -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="flex-1 rounded-2xl border border-white/[0.04] p-8 transition-all duration-300 hover:border-white/[0.08]"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="mb-5" style={{ color: stepColors[i] }}>
                    {step.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-[#8892A8]">
                    {step.description}
                  </p>
                </motion.div>
              </motion.div>
            </div>
          ))}

          {/* Final separator */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
            className="h-px w-full origin-left border-white/[0.04] bg-white/[0.04]"
          />
        </div>
      </div>
    </section>
  );
}
