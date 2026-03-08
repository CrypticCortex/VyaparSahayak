"use client";

import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import FeaturesGrid from "@/components/landing/features-grid";
import ArchitectureSection from "@/components/landing/architecture-section";
import Footer from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <Hero />
      <FeaturesGrid />
      <ArchitectureSection />
      <Footer />
    </div>
  );
}
