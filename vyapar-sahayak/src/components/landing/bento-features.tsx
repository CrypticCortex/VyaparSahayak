"use client";

import { motion } from "framer-motion";

// Mini sparkline chart for the Dead Stock Radar card
function SparklineChart() {
  const points = [40, 65, 35, 70, 55, 80, 45, 90, 60, 30, 50, 75];
  const width = 280;
  const height = 80;
  const maxVal = Math.max(...points);
  const minVal = Math.min(...points);

  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - minVal) / (maxVal - minVal)) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9933" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9933" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF9933" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#sparkFill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        viewport={{ once: true }}
      />
      <motion.path
        d={pathData}
        fill="none"
        stroke="url(#sparkGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        viewport={{ once: true }}
      />
    </svg>
  );
}

interface FeatureCardData {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: FeatureCardData[] = [
  {
    title: "Dead Stock Radar",
    description:
      "Real-time visualization of inventory health. Every SKU color-coded by risk level -- so you spot problems before they cost you.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <circle
          cx="12"
          cy="12"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path
          d="M12 2v4M12 18v4M2 12h4M18 12h4"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    title: "Expiry Alerts",
    description:
      "Automated alerts 90, 60, 30 days before expiry. Never lose inventory to expired dates again.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 01-3.46 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Campaign Generator",
    description:
      "AI creates targeted clearance campaigns with optimal discount strategies.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "WhatsApp Reports",
    description:
      "Daily stock health summary delivered straight to WhatsApp.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Works Offline",
    description:
      "Core features work without internet. Syncs when you're back online.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.53 16.11a6 6 0 016.95 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
        <line
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Regional Language Support",
    description:
      "Hindi, Tamil, Telugu, Marathi and more. Works in your language.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function BentoFeatures() {
  return (
    <section
      id="features"
      className="relative px-6 py-32"
      style={{ background: "#060B18" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Editorial header -- left-aligned for asymmetry */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <p className="mb-5 text-xs font-medium uppercase tracking-widest text-[#FF9933]">
            Features
          </p>
          <h2 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Everything you need to
            <br />
            <span className="text-gradient-warm">fight dead stock</span>
          </h2>
        </motion.div>

        {/* Asymmetric 12-column bento grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Hero card -- Dead Stock Radar: col-span-8, row-span-2 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0 }}
            viewport={{ once: true }}
            whileHover={{
              y: -2,
              transition: { duration: 0.25 },
            }}
            className="col-span-12 row-span-2 rounded-2xl p-px md:col-span-8"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,153,51,0.3) 0%, rgba(0,102,255,0.2) 50%, rgba(232,69,60,0.15) 100%)",
            }}
          >
            <div
              className="flex h-full flex-col rounded-2xl p-8"
              style={{ background: "rgba(6,11,24,0.95)" }}
            >
              <div className="mb-5 text-[#FF9933]">{features[0].icon}</div>
              <h3 className="font-display mb-3 text-2xl font-bold text-white">
                {features[0].title}
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-[#8892A8]">
                {features[0].description}
              </p>
              <div className="mt-auto pt-8">
                <SparklineChart />
              </div>
            </div>
          </motion.div>

          {/* Expiry Alerts: col-span-4, single row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            whileHover={{
              y: -2,
              borderColor: "rgba(255,255,255,0.08)",
              transition: { duration: 0.25 },
            }}
            className="col-span-12 rounded-2xl border border-white/[0.04] p-6 sm:col-span-6 md:col-span-4"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="mb-4 text-[#FF9933]">{features[1].icon}</div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {features[1].title}
            </h3>
            <p className="text-sm leading-relaxed text-[#8892A8]">
              {features[1].description}
            </p>
          </motion.div>

          {/* Campaign Generator: col-span-4, single row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{
              y: -2,
              borderColor: "rgba(255,255,255,0.08)",
              transition: { duration: 0.25 },
            }}
            className="col-span-12 rounded-2xl border border-white/[0.04] p-6 sm:col-span-6 md:col-span-4"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="mb-4 text-[#FF9933]">{features[2].icon}</div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {features[2].title}
            </h3>
            <p className="text-sm leading-relaxed text-[#8892A8]">
              {features[2].description}
            </p>
          </motion.div>

          {/* Bottom row -- 3 equal cards */}
          {[features[3], features[4], features[5]].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{
                y: -2,
                borderColor: "rgba(255,255,255,0.08)",
                transition: { duration: 0.25 },
              }}
              className="col-span-12 rounded-2xl border border-white/[0.04] p-6 sm:col-span-6 md:col-span-4"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="mb-4 text-[#FF9933]">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#8892A8]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
