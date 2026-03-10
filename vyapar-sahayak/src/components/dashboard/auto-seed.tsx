"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STATS = [
  { label: "Products", value: "15", icon: "box" },
  { label: "Zones", value: "4", icon: "map" },
  { label: "Retailers", value: "24", icon: "store" },
  { label: "Sales History", value: "90 days", icon: "calendar" },
];

const STEPS = [
  { label: "Importing inventory data", icon: "box", duration: "~2s" },
  { label: "Running ML dead stock detection", icon: "brain", duration: "~3s" },
  { label: "Analyzing sales velocity patterns", icon: "chart", duration: "~2s" },
  { label: "Generating AI recommendations", icon: "sparkle", duration: "~4s" },
  { label: "Creating campaign posters with GenAI", icon: "image", duration: "~5s" },
  { label: "Building clearance campaigns", icon: "rocket", duration: "~2s" },
];

// Placeholder poster data for the preloading animation
const POSTER_PREVIEWS = [
  { title: "Summer Clearance", color: "#FF9933", product: "Surf Excel 1kg" },
  { title: "Zone B2 Flash Sale", color: "#E8453C", product: "Colgate MaxFresh" },
  { title: "Buy 2 Get 1 Free", color: "#0066FF", product: "Maggi Noodles" },
  { title: "Retailer Special", color: "#10B981", product: "Parle-G Biscuit" },
];

function StepIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-5 h-5";
  const props = { className: cn, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (type) {
    case "box":
      return (
        <svg {...props}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "map":
      return (
        <svg {...props}>
          <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
          <path d="M9 4v13" />
          <path d="M15 7v13" />
        </svg>
      );
    case "store":
      return (
        <svg {...props}>
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "brain":
      return (
        <svg {...props}>
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case "image":
      return (
        <svg {...props}>
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...props}>
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
      strokeWidth={2.5}
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

// Animated poster card that appears during the "Creating campaign posters" step
function PosterPreview({ poster, index }: { poster: typeof POSTER_PREVIEWS[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.3, duration: 0.5, ease: "easeOut" }}
      className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white"
    >
      {/* Poster visual */}
      <div
        className="h-20 flex items-end p-2"
        style={{
          background: `linear-gradient(135deg, ${poster.color}22 0%, ${poster.color}44 100%)`,
        }}
      >
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${poster.color}15 50%, transparent 100%)`,
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: index * 0.2 }}
        />
        <div className="relative z-10">
          <p className="text-[9px] font-bold text-gray-700 leading-tight">{poster.title}</p>
          <p className="text-[8px] text-gray-500">{poster.product}</p>
        </div>
      </div>
      {/* GenAI badge */}
      <div className="px-2 py-1.5 flex items-center gap-1">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: poster.color }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity, delay: index * 0.15 }}
        />
        <span className="text-[8px] text-gray-400 font-medium">AI Generated</span>
      </div>
    </motion.div>
  );
}

export function AutoSeed() {
  const [phase, setPhase] = useState<"overview" | "processing">("overview");
  const [activeStep, setActiveStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const launch = useCallback(async () => {
    setPhase("processing");
    setError(null);

    // Stagger step reveals: each step appears 1.2s apart
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    // Start at step 0 immediately
    setActiveStep(0);

    // Min display time for animation, then navigate to SSR seed page
    await new Promise((r) => setTimeout(r, STEPS.length * 1200 + 2000));
    clearInterval(stepTimer);
    setActiveStep(STEPS.length - 1);
    await new Promise((r) => setTimeout(r, 800));
    // Navigate to the SSR seed page which runs Prisma and redirects back
    window.location.href = "/demo/seed";
  }, [router]);

  // Show poster gallery when we're on or past the poster step (index 4)
  const showPosters = activeStep >= 4;

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
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.png"
                alt="Vyapar Sahayak"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF9933]/10 px-4 py-1.5 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
                <span className="text-xs font-medium text-[#FF9933]">Demo Environment</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Kalyan Traders</h1>
              <p className="text-sm text-gray-500">FMCG Distributor, Tirunelveli, Tamil Nadu</p>
            </div>

            {/* Glass card with dataset stats */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                Dataset Overview
              </p>
              <div className="grid grid-cols-2 gap-4">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FF9933]/10 flex items-center justify-center text-[#FF9933]">
                      <StepIcon type={stat.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</p>
                      <p className="text-[10px] text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Pipeline preview */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 mb-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                AI Pipeline
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                      <StepIcon type={step.icon} className="w-3 h-3" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <svg width="12" height="8" viewBox="0 0 12 8" className="text-gray-300">
                        <path d="M8 0l4 4-4 4M0 4h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 text-center leading-relaxed mb-6">
              Real FMCG inventory data across 6 distribution zones.
              AI will scan for dead stock, analyze velocity patterns,
              generate GenAI campaign posters, and build clearance strategies.
            </p>

            {/* Error message */}
            {error && (
              <p className="text-xs text-red-500 text-center mb-4">{error}</p>
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
              {["AWS Bedrock", "Nova Lite", "Strands SDK", "GenAI Posters"].map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] text-gray-500/60 border border-gray-200 rounded-full px-2.5 py-1"
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
            <div className="flex justify-center mb-8">
              <div className="relative">
                <motion.div
                  className="w-16 h-16 rounded-full"
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

            {/* Processing header */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Processing Seed Data</h2>
              <p className="text-xs text-gray-500 mt-1">
                Step {Math.min(activeStep + 1, STEPS.length)} of {STEPS.length}
              </p>
            </div>

            {/* Steps list */}
            <div className="space-y-2.5">
              {STEPS.map((step, i) => {
                const isActive = i <= activeStep;
                const isComplete = i < activeStep;

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-3"
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
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${
                        isComplete ? "text-gray-500" : "text-gray-900"
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
                    </div>
                    {isComplete && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-gray-400"
                      >
                        Done
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Poster generation gallery - appears when step 4 (posters) is active */}
            <AnimatePresence>
              {showPosters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md bg-[#FF9933]/10 flex items-center justify-center text-[#FF9933]">
                        <StepIcon type="image" className="w-3 h-3" />
                      </div>
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        GenAI Poster Preview
                      </p>
                      <motion.div
                        className="ml-auto flex items-center gap-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-1 h-1 rounded-full bg-[#FF9933]" />
                        <span className="text-[9px] text-[#FF9933] font-medium">Generating</span>
                      </motion.div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {POSTER_PREVIEWS.map((poster, i) => (
                        <PosterPreview key={poster.title} poster={poster} index={i} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-6 rounded-full bg-gray-100 h-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundImage: "linear-gradient(90deg, #FF9933, #E8453C)",
                }}
                initial={{ width: "0%" }}
                animate={{
                  width: `${Math.min(((activeStep + 1) / STEPS.length) * 100, 100)}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Progress text */}
            <motion.p
              className="text-xs text-gray-500 text-center mt-4"
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
