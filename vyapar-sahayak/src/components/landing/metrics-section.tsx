"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * target);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const metrics = [
  {
    prefix: "Rs.",
    value: 2.4,
    suffix: " crore",
    decimals: 1,
    label: "Dead stock value recovered across distributors in the network",
    color: "#FF9933",
  },
  {
    prefix: "",
    value: 91,
    suffix: "%",
    decimals: 0,
    label: "See ROI in 60 days or less from first activation",
    color: "#10B981",
  },
  {
    prefix: "",
    value: 3,
    suffix: " min",
    decimals: 0,
    label: "Average setup time from sign-up to first insight",
    color: "#0066FF",
  },
  {
    prefix: "",
    value: 250,
    suffix: "+",
    decimals: 0,
    label: "Retailers onboarded and actively clearing dead stock",
    color: "#E8453C",
  },
];

export default function MetricsSection() {
  return (
    <section
      className="relative overflow-hidden py-24"
      style={{ background: "#060B18" }}
    >
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,153,51,0.05) 0%, rgba(26,35,126,0.1) 50%, rgba(0,102,255,0.05) 100%)",
        }}
      />
      <div className="absolute inset-0 border-y border-white/[0.04]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div className="flex flex-col">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`flex items-baseline gap-4 py-8 sm:gap-6 ${
                i < metrics.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
            >
              <div
                className="font-display text-6xl font-bold sm:text-7xl lg:text-8xl"
                style={{ color: metric.color }}
              >
                <AnimatedCounter
                  target={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  decimals={metric.decimals}
                />
              </div>
              <p className="max-w-xs text-base text-[#8892A8] leading-relaxed">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
