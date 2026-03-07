"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import ProblemSection from "@/components/landing/problem-section";
import SolutionSteps from "@/components/landing/solution-steps";
import BentoFeatures from "@/components/landing/bento-features";
import DemoSection from "@/components/landing/demo-section";
import MetricsSection from "@/components/landing/metrics-section";
import Pricing from "@/components/landing/pricing";
import Footer from "@/components/landing/footer";

export default function Home() {
  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div
      className="noise-overlay min-h-screen overflow-x-hidden"
      style={{ background: "#060B18", color: "#ffffff" }}
    >
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSteps />
      <BentoFeatures />
      <DemoSection />
      <MetricsSection />
      <Pricing />
      <Footer />
    </div>
  );
}
