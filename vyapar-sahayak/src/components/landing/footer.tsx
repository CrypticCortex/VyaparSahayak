"use client";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
        {/* Logo + tagline */}
        <div className="flex items-center gap-4">
          <a href="#" className="flex items-center gap-1">
            <span className="text-lg font-bold text-gray-900">Vyapar</span>
            <span className="text-lg font-bold text-[#FF9933]">Sahayak</span>
          </a>
          <span className="hidden h-4 w-px bg-gray-300 sm:block" />
          <span className="hidden text-sm text-gray-400 sm:block">
            Built for Indian FMCG
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="/demo"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-[#FF9933]"
          >
            Try Demo
          </a>
          <motion.a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:border-[#25D366]/30 hover:text-[#25D366]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.6 2.33A7.46 7.46 0 008.04.5C3.87.5.5 3.87.5 8.04c0 1.33.35 2.63 1.01 3.77L.4 15.5l3.8-1.08c1.1.6 2.33.92 3.6.92h.03c4.17 0 7.57-3.37 7.57-7.54a7.5 7.5 0 00-1.8-5.47z"
                fill="currentColor"
              />
            </svg>
            WhatsApp
          </motion.a>
        </div>
      </div>

      {/* Copyright */}
      <div className="mx-auto mt-8 max-w-5xl border-t border-gray-200 pt-6 text-center">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} VyaparSahayak. Made in India.
        </p>
      </div>
    </footer>
  );
}
