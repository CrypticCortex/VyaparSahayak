# Guided Demo Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the AutoSeed component into a theatrical two-phase demo launch experience for AWS hackathon presentation.

**Architecture:** Replace the plain spinner in `auto-seed.tsx` with Phase A (dataset overview card with "Launch AI Analysis" button) and Phase B (5-second staggered animation showing AI pipeline steps). Uses `Promise.all([seedAndDetect(), delay(5000)])` so animation is always 5s minimum.

**Tech Stack:** React, Framer Motion (already installed), Tailwind CSS, Next.js router

---

## Context

- Seed data: 33 products, 6 zones, 50 retailers, 90 days sales history
- Seed route (`/api/seed`) already runs ML detection inline and creates alerts, campaigns, suggestions
- Detect route (`/api/detect`) adds LLM enrichment on top
- Current `auto-seed.tsx` is a plain white spinner that auto-runs on mount
- New version: dark glass card with manual "Launch" button, then theatrical animation
- Design system: bg #060B18, cards bg-white/[0.03] border-white/[0.06], saffron #FF9933

---

### Task 1: Rewrite auto-seed.tsx with two-phase experience

**Files:**
- Rewrite: `vyapar-sahayak/src/components/dashboard/auto-seed.tsx`

**Step 1: Write the complete new component**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STATS = [
  { label: "Products", value: "33", icon: "box" },
  { label: "Zones", value: "6", icon: "map" },
  { label: "Retailers", value: "50", icon: "store" },
  { label: "Sales History", value: "90 days", icon: "calendar" },
];

const STEPS = [
  { label: "Importing inventory data", icon: "box" },
  { label: "Running ML dead stock detection", icon: "brain" },
  { label: "Analyzing sales velocity patterns", icon: "chart" },
  { label: "Generating AI recommendations", icon: "sparkle" },
  { label: "Building clearance campaigns", icon: "rocket" },
];

function StepIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (type) {
    case "box":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "map":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
          <path d="M9 4v13" />
          <path d="M15 7v13" />
        </svg>
      );
    case "store":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
          <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "brain":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
          <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
          <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
          <path d="M6 18a4 4 0 0 1-1.967-.516" />
          <path d="M19.967 17.484A4 4 0 0 1 18 18" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "sparkle":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case "rocket":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    default:
      return null;
  }
}

function CheckIcon() {
  return (
    <motion.svg
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-5 h-5 text-[#10B981]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M20 6 9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  );
}

export function AutoSeed() {
  const [phase, setPhase] = useState<"overview" | "processing" | "done">("overview");
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const launch = useCallback(async () => {
    setPhase("processing");
    setError(null);

    // Stagger step reveals: each step appears 1s apart
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    // Start at step 0 immediately
    setActiveStep(0);

    try {
      // Run seed + detect in parallel with 5s minimum timer
      await Promise.all([
        (async () => {
          await fetch("/api/seed", { method: "POST" });
          await fetch("/api/detect", { method: "POST" });
        })(),
        new Promise((r) => setTimeout(r, 5000)),
      ]);

      clearInterval(stepTimer);
      setActiveStep(STEPS.length - 1);

      // Brief pause to show all checkmarks, then transition
      await new Promise((r) => setTimeout(r, 800));
      setPhase("done");

      // Let the exit animation play, then refresh
      await new Promise((r) => setTimeout(r, 500));
      router.refresh();
    } catch {
      clearInterval(stepTimer);
      setError("Setup failed. Please try again.");
      setPhase("overview");
      setActiveStep(-1);
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <AnimatePresence mode="wait">
        {phase === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF9933]/10 px-4 py-1.5 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
                <span className="text-xs font-medium text-[#FF9933]">Demo Environment</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Kalyan Traders</h1>
              <p className="text-sm text-[#8892A8]">FMCG Distributor, Tirunelveli, Tamil Nadu</p>
            </div>

            {/* Glass card with dataset stats */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 mb-6">
              <p className="text-xs font-medium text-[#8892A8] uppercase tracking-wider mb-4">
                Dataset Overview
              </p>
              <div className="grid grid-cols-2 gap-4">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FF9933]/10 flex items-center justify-center text-[#FF9933]">
                      <StepIcon type={stat.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white leading-tight">{stat.value}</p>
                      <p className="text-[10px] text-[#8892A8]">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-[#8892A8] text-center leading-relaxed mb-6">
              Real FMCG inventory data across 6 distribution zones.
              AI will scan for dead stock, analyze velocity patterns,
              and generate clearance strategies.
            </p>

            {/* Error message */}
            {error && (
              <p className="text-xs text-[#E8453C] text-center mb-4">{error}</p>
            )}

            {/* Launch button */}
            <button
              onClick={launch}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF9933]/20 active:scale-[0.98]"
              style={{
                backgroundImage: "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
              }}
            >
              Launch AI Analysis
            </button>

            {/* Tech badges */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {["AWS Bedrock", "Nova Lite", "Strands SDK"].map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] text-[#8892A8]/60 border border-white/[0.04] rounded-full px-2.5 py-1"
                >
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Glowing orb */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                <motion.div
                  className="w-20 h-20 rounded-full"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #FF9933 0%, #E8453C 50%, #0066FF 100%)",
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-30"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #FF9933, #E8453C)",
                  }}
                />
              </div>
            </div>

            {/* Steps list */}
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isActive = i <= activeStep;
                const isComplete = i < activeStep;

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isComplete
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : "bg-[#FF9933]/10 text-[#FF9933]"
                    }`}>
                      {isComplete ? (
                        <CheckIcon />
                      ) : (
                        <StepIcon type={step.icon} className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      isComplete ? "text-[#8892A8]" : "text-white"
                    }`}>
                      {step.label}
                      {!isComplete && isActive && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          ...
                        </motion.span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress text */}
            <motion.p
              className="text-xs text-[#8892A8] text-center mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Powered by AWS Bedrock + Amazon Nova
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Verify dev server renders correctly**

Run: `cd vyapar-sahayak && npm run dev`
Navigate to `/demo` -- should see the dark Dataset Overview card with the Launch button.

**Step 3: Test the full flow**

1. Click "Launch AI Analysis"
2. Verify 5-step animation plays with staggered reveals
3. Verify checkmarks appear as steps complete
4. After ~5 seconds, dashboard should appear
5. GuidedTour overlay should kick in for first-time users

---

### Task 2: Add reset keyboard shortcut to demo layout

**Files:**
- Modify: `vyapar-sahayak/src/app/demo/layout.tsx`

**Step 1: Read the current layout**

Read `vyapar-sahayak/src/app/demo/layout.tsx` to understand the current structure.

**Step 2: Add a client component for the keyboard shortcut**

Add a small `DemoResetShortcut` component inline or as a separate component that listens for Ctrl+Shift+R and calls `/api/seed` then redirects.

This is a convenience feature for the presenter. Add a `useEffect` in the DemoShell (or layout) that:
- Listens for `keydown` event
- On Ctrl+Shift+R: prevents default, calls `fetch("/api/seed", { method: "POST" })`, then `window.location.href = "/demo"`

**Step 3: Verify**

Press Ctrl+Shift+R on the dashboard -- should reset data and redirect to the Dataset Overview screen.
