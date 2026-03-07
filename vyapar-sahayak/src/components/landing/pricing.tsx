"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const tiers = [
  {
    name: "Starter",
    monthlyPrice: 999,
    features: [
      "1 distributor",
      "100 SKUs tracked",
      "Basic expiry alerts",
      "Weekly WhatsApp reports",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    monthlyPrice: 2499,
    features: [
      "3 distributors",
      "Unlimited SKUs",
      "AI clearance campaigns",
      "Daily WhatsApp reports",
      "Priority support",
      "Regional language support",
      "Custom report templates",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 0, // custom
    features: [
      "Unlimited distributors",
      "Unlimited SKUs",
      "Dedicated account manager",
      "Custom integrations",
      "On-premise option",
      "SLA guarantee",
      "Training & onboarding",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  function formatPrice(monthly: number) {
    if (monthly === 0) return "Custom";
    const price = annual ? Math.round(monthly * 0.8) : monthly;
    return `Rs.${price.toLocaleString("en-IN")}`;
  }

  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[#FF9933]">
            Pricing
          </p>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-[#8892A8]">
            No hidden charges. GST invoice provided.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-14 flex items-center justify-center"
        >
          <div className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                !annual
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                annual
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Annual
              <span className="ml-2 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs text-[#10B981]">
                20% off
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                y: -4,
                transition: { duration: 0.2 },
              }}
              className={`group relative rounded-2xl border p-8 transition-all duration-300 hover:border-white/[0.08] hover:shadow-lg hover:shadow-black/20 ${
                tier.popular
                  ? "border-[#FF9933]/20"
                  : "border-white/[0.04]"
              }`}
              style={{
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="rounded-full px-4 py-1 text-xs font-semibold text-white"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
                    }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {tier.name}
                </h3>
                <div className="mt-4">
                  <span className="font-display text-4xl font-bold text-white">
                    {formatPrice(tier.monthlyPrice)}
                  </span>
                  {tier.monthlyPrice > 0 && (
                    <span className="ml-1.5 text-sm text-[#8892A8]">
                      /month
                    </span>
                  )}
                </div>
              </div>

              <ul className="mb-8 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-[#8892A8]"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5 shrink-0"
                    >
                      <path
                        d="M3 8l3.5 3.5L13 5"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={tier.monthlyPrice === 0 ? "#contact" : "/demo"}
                className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all active:scale-[0.97] ${
                  tier.popular
                    ? "text-white hover:opacity-90"
                    : "border border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06]"
                }`}
                style={
                  tier.popular
                    ? {
                        backgroundImage:
                          "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
                      }
                    : undefined
                }
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
