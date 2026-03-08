"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
  {
    title: "Dead Stock Radar",
    description:
      "AI scores every SKU by velocity, shelf life, and zone demand. Know what is stuck before it expires.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    title: "Smart Campaigns",
    description:
      "Auto-generate WhatsApp offers with AI posters and one-tap ordering links for your retailers.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
      </svg>
    ),
  },
  {
    title: "Zone Intelligence",
    description:
      "See which zones move what products. Optimize allocation across your distribution network in seconds.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Proactive Alerts",
    description:
      "Get notified before stock expires, not after. AI watches expiry dates and velocity trends 24/7.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
        <path d="M12 2v1" />
      </svg>
    ),
  },
];

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const cardVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease,
    },
  }),
};

export default function FeaturesGrid() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-white px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to clear inventory
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-gray-500">
            Four AI-powered tools working together to keep your stock moving and
            your capital free.
          </p>
        </motion.div>

        {/* 2x2 grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              whileHover={{
                y: -4,
                boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
                borderColor: "rgba(255,153,51,0.3)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group rounded-2xl border border-gray-200 bg-gray-50/50 p-7 transition-colors"
            >
              {/* Icon */}
              <motion.div
                whileHover={{ rotate: -6, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF9933]/10 text-[#FF9933]"
              >
                {feature.icon}
              </motion.div>

              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
