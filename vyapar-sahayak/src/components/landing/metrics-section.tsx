"use client";

import { motion, useInView, useSpring, useTransform, useMotionValue } from "framer-motion";
import { useRef, useEffect } from "react";

function AnimatedNumber({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });
  const display = useTransform(springValue, (v) =>
    `${prefix}${v.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, target, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

const metrics = [
  {
    prefix: "Rs.",
    value: 2.4,
    suffix: " Cr",
    decimals: 1,
    label: "Capital recovered",
  },
  {
    prefix: "",
    value: 91,
    suffix: "%",
    decimals: 0,
    label: "ROI in 60 days",
  },
  {
    prefix: "",
    value: 3,
    suffix: " min",
    decimals: 0,
    label: "Setup time",
  },
  {
    prefix: "",
    value: 250,
    suffix: "+",
    decimals: 0,
    label: "Active retailers",
  },
];

export default function MetricsSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-center"
            >
              <div className="text-3xl font-extrabold tracking-tight text-[#FF9933] sm:text-4xl">
                <AnimatedNumber
                  target={metric.value}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  decimals={metric.decimals}
                />
              </div>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
