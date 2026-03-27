"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const beforeItems = [
  { text: "Dead stock detected after 90+ days", detail: "By then it is too late to recover" },
  { text: "Manual Excel tracking", detail: "Hours wasted every week on spreadsheets" },
  { text: "No campaign tools", detail: "Retailers never hear about clearance offers" },
  { text: "Rs.5.2L lost per quarter", detail: "Written off as expired or unsold goods" },
];

const afterItems = [
  { text: "AI detects in 24 hours", detail: "ML scoring runs daily on every SKU" },
  { text: "Universal data ingestion", detail: "Upload any format -- bills, Excel, photos" },
  { text: "WhatsApp campaigns auto-generated", detail: "Tamil posters + one-tap ordering links" },
  { text: "Rs.3.8L recovered (73% rate)", detail: "Cleared before expiry hits your margins" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.1, duration: 0.6, ease },
  }),
};

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400">
      <line x1="4" y1="4" x2="14" y2="14" />
      <line x1="14" y1="4" x2="4" y2="14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-500">
      <polyline points="3 9 7 13 15 5" />
    </svg>
  );
}

export default function BeforeAfter() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-gray-50/60 px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The difference is night and day
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-gray-500">
            See how distributors move from reactive losses to proactive recovery.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Before column */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="rounded-2xl border border-red-200/60 bg-white p-7"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-xs font-semibold text-red-600">
                Without Vyapar Sahayak
              </span>
            </div>
            <ul className="space-y-5">
              {beforeItems.map((item, i) => (
                <motion.li
                  key={i}
                  custom={i + 1}
                  variants={cardVariants}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  className="flex gap-3"
                >
                  <XIcon />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.text}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* After column */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="rounded-2xl border border-emerald-200/60 bg-white p-7"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
              <motion.span
                animate={isInView ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-2 w-2 rounded-full bg-emerald-500"
              />
              <span className="text-xs font-semibold text-emerald-700">
                With Vyapar Sahayak
              </span>
            </div>
            <ul className="space-y-5">
              {afterItems.map((item, i) => (
                <motion.li
                  key={i}
                  custom={i + 2}
                  variants={cardVariants}
                  initial="hidden"
                  animate={isInView ? "visible" : "hidden"}
                  className="flex gap-3"
                >
                  <CheckIcon />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.text}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
