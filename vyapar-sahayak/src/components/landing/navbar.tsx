"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Vyapar Sahayak"
            width={36}
            height={36}
            className="w-9 h-9 object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Vyapar
          </span>
          <span className="text-xl font-bold tracking-tight text-[#FF9933]">
            Sahayak
          </span>
        </a>

        {/* Desktop CTA */}
        <a
          href="/demo"
          className="hidden rounded-full bg-[#FF9933] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#E8870A] hover:shadow-md active:scale-[0.97] md:inline-flex"
        >
          Try Demo
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <motion.span
            animate={
              mobileOpen
                ? { rotate: 45, y: 6, background: "#111827" }
                : { rotate: 0, y: 0, background: "#111827" }
            }
            className="block h-0.5 w-5 rounded-full bg-gray-900"
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            className="block h-0.5 w-5 rounded-full bg-gray-900"
          />
          <motion.span
            animate={
              mobileOpen
                ? { rotate: -45, y: -6, background: "#111827" }
                : { rotate: 0, y: 0, background: "#111827" }
            }
            className="block h-0.5 w-5 rounded-full bg-gray-900"
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-gray-100 bg-white md:hidden"
          >
            <div className="px-6 py-5">
              <a
                href="/demo"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-full bg-[#FF9933] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#E8870A]"
              >
                Try Demo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
