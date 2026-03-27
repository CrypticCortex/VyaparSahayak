"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CommitStats } from "./wizard";

interface CommitStepProps {
  stats: CommitStats;
  onReset: () => void;
}

const statCards = [
  {
    key: "productsCreated" as const,
    label: "Products Created",
    color: "text-[#FF9933]",
    bgColor: "bg-[#FF9933]/10",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    key: "inventoryRecords" as const,
    label: "Inventory Records",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8V2z",
  },
  {
    key: "deadStockAlerts" as const,
    label: "Dead Stock Alerts",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  },
  {
    key: "errorsSkipped" as const,
    label: "Errors Skipped",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: "M18 6L6 18M6 6l12 12",
  },
];

export function CommitStep({ stats, onReset }: CommitStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent>
          <div className="flex flex-col items-center text-center py-6">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
            >
              <motion.svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <path d="M20 6L9 17l-5-5" />
              </motion.svg>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-bold text-gray-900"
            >
              Data imported successfully!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-gray-500 mt-2"
            >
              Your file has been processed and committed to the database
            </motion.p>
          </div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-4 mt-4"
          >
            {statCards.map((card, i) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white"
              >
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center shrink-0`}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={card.color}
                  >
                    <path d={card.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {stats[card.key].toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex items-center justify-center gap-3 mt-8"
          >
            <Button asChild variant="outline">
              <Link href="/demo">Go to Dashboard</Link>
            </Button>
            <Button
              onClick={onReset}
              className="bg-gradient-to-r from-[#FF9933] to-[#FF8000] hover:from-[#E68A2E] hover:to-[#E67300] text-white"
            >
              Upload Another File
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
