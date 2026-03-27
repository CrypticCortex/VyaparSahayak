"use client";

import { motion } from "framer-motion";

interface RoiCardProps {
  recoveryPotential: number;
  monthlyCost?: number;
}

function formatLakhs(value: number): string {
  if (value >= 10000000) return "Rs." + (value / 10000000).toFixed(1) + "Cr";
  if (value >= 100000) return "Rs." + (value / 100000).toFixed(1) + "L";
  if (value >= 1000) return "Rs." + (value / 1000).toFixed(1) + "K";
  return "Rs." + Math.round(value);
}

export function RoiCard({ recoveryPotential, monthlyCost = 500 }: RoiCardProps) {
  const roiMultiple = monthlyCost > 0 ? Math.round(recoveryPotential / monthlyCost) : 0;
  // At scale: 100 distributors * recovery potential
  const atScale = recoveryPotential * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF9933] via-[#10B981] to-[#FF9933] p-[1.5px]">
        <div className="w-full h-full rounded-2xl bg-white" />
      </div>

      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF9933]/15 to-[#10B981]/15 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest">
            ROI Potential
          </span>
        </div>

        {/* Recovery headline */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium mb-0.5">Recovery Potential</p>
          <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {formatLakhs(recoveryPotential)}
          </p>
        </div>

        {/* ROI badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF9933]/10 to-[#10B981]/10">
            <span className="text-lg font-extrabold text-[#FF9933]">{roiMultiple}x</span>
            <span className="text-[10px] text-gray-600 font-semibold">ROI</span>
          </div>
          <span className="text-[10px] text-gray-500">
            at {formatLakhs(monthlyCost)}/month
          </span>
        </div>

        {/* At scale */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 font-medium">At scale: 100 distributors</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            {formatLakhs(atScale)}/month recovery
          </p>
        </div>
      </div>
    </motion.div>
  );
}
