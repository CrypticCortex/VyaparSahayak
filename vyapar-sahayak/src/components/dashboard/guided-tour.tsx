"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: "top" | "bottom";
}

const STEPS: TourStep[] = [
  {
    selector: "[data-tour='hero-cards']",
    title: "Dead Stock Overview",
    description:
      "See your total dead stock value and how much you've cleared. AI scans your inventory to find stuck items.",
    position: "bottom",
  },
  {
    selector: "[data-tour='quick-actions']",
    title: "Quick Actions",
    description:
      "Scan inventory for dead stock, view alerts, manage campaigns, and check your retailer network.",
    position: "bottom",
  },
  {
    selector: "[data-tour='trend-chart']",
    title: "Dead Stock Trend",
    description:
      "Track how your dead stock value changes week over week. The goal is to drive this down.",
    position: "top",
  },
  {
    selector: "[data-tour='ai-insight']",
    title: "AI Recommendations",
    description:
      "Get smart suggestions powered by AWS Bedrock. The AI analyzes sales patterns to suggest the best clearance strategy.",
    position: "top",
  },
];

const STORAGE_KEY = "vyapar-tour-seen";

export function GuidedTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateRect = useCallback(() => {
    if (!visible) return;
    const el = document.querySelector(STEPS[step].selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setRect(el.getBoundingClientRect());
      }, 400);
    }
  }, [step, visible]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible || !rect) return null;

  const pad = 8;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Cutout bounds in viewport coordinates
  const cutLeft = rect.left - pad;
  const cutTop = rect.top - pad;
  const cutRight = rect.right + pad;
  const cutBottom = rect.bottom + pad;

  // Tooltip: position below or above the spotlight, clamped to viewport
  const tooltipGap = 12;
  const bottomNavHeight = 80;
  let tooltipStyle: React.CSSProperties;

  if (current.position === "bottom") {
    const top = cutBottom + tooltipGap;
    // If tooltip would overlap bottom nav, push it up
    const maxTop = window.innerHeight - bottomNavHeight - 160;
    tooltipStyle = { top: Math.min(top, maxTop) };
  } else {
    // Position above the spotlight
    const bottom = window.innerHeight - cutTop + tooltipGap;
    tooltipStyle = { bottom };
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* 4-rect overlay: top, bottom, left, right strips around the cutout */}
      {/* Top strip */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{ height: cutTop, background: "rgba(0,0,0,0.7)" }}
        onClick={dismiss}
      />
      {/* Bottom strip */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ top: cutBottom, background: "rgba(0,0,0,0.7)" }}
        onClick={dismiss}
      />
      {/* Left strip */}
      <div
        className="absolute left-0"
        style={{ top: cutTop, height: cutBottom - cutTop, width: cutLeft, background: "rgba(0,0,0,0.7)" }}
        onClick={dismiss}
      />
      {/* Right strip */}
      <div
        className="absolute right-0"
        style={{ top: cutTop, height: cutBottom - cutTop, left: cutRight, background: "rgba(0,0,0,0.7)" }}
        onClick={dismiss}
      />

      {/* Spotlight border */}
      <div
        className="absolute rounded-2xl pointer-events-none"
        style={{
          left: cutLeft,
          top: cutTop,
          width: cutRight - cutLeft,
          height: cutBottom - cutTop,
          border: "2px solid rgba(255, 153, 51, 0.5)",
          boxShadow: "0 0 30px rgba(255, 153, 51, 0.15)",
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute left-4 right-4 rounded-2xl p-5"
        style={{
          ...tooltipStyle,
          maxWidth: "calc(100vw - 32px)",
          background: "rgba(10, 17, 40, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Step indicator */}
        <div className="flex gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-colors ${
                i <= step ? "bg-[#FF9933]" : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>

        <h3 className="text-sm font-bold text-white mb-1">
          {current.title}
        </h3>
        <p className="text-xs text-[#8892A8] leading-relaxed mb-4">
          {current.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-[#8892A8] hover:text-white transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all hover:scale-[1.02]"
              style={{
                backgroundImage: "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
              }}
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
