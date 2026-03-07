const quickLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "#demo" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Logo + tagline */}
          <div>
            <a href="#" className="inline-block">
              <span className="text-xl font-bold">
                <span className="font-display text-white">Vyapar</span>
                <span className="text-gradient-warm">Sahayak</span>
              </span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#8892A8]">
              AI-powered inventory intelligence for Indian FMCG distributors.
              Stop losing money to dead stock.
            </p>

            {/* Data residency badge */}
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#8892A8]">
              <span className="font-medium text-white/50">IN</span>
              <span>Data stored in India</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/40 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">
              Get in Touch
            </h4>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/20 px-4 py-2 text-sm text-[#25D366] transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.6 2.33A7.46 7.46 0 008.04.5C3.87.5.5 3.87.5 8.04c0 1.33.35 2.63 1.01 3.77L.4 15.5l3.8-1.08c1.1.6 2.33.92 3.6.92h.03c4.17 0 7.57-3.37 7.57-7.54a7.5 7.5 0 00-1.8-5.47z"
                  fill="currentColor"
                />
              </svg>
              WhatsApp Us
            </a>
            <p className="mt-4 text-xs text-[#8892A8]">
              GSTIN: 33AABCK1234F1Z5
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-white/[0.04] pt-6 text-center">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} VyaparSahayak. All rights
            reserved. Made with care in India.
          </p>
        </div>
      </div>
    </footer>
  );
}
