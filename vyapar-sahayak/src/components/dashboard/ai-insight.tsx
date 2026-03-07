import Link from "next/link";

interface AiInsightProps {
  message: string;
  metric?: string;
  supporting?: string;
  linkHref: string;
}

export function AiInsight({ message, metric, supporting, linkHref }: AiInsightProps) {
  return (
    <div className="px-4">
      <div className="p-[1px] rounded-2xl" style={{
        background: "linear-gradient(135deg, #FF9933, #E8453C)",
      }}>
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{
          background: "#0A1128",
        }}>
          {/* Decorative orb */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #FF9933, transparent)" }} />

          <div className="relative">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="w-5 h-5 rounded-md bg-[#FF9933]/15 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#FF9933]/70 uppercase tracking-widest">
                AI Insight
              </span>
            </div>

            <p className="text-sm text-white/90 leading-relaxed mb-3 font-medium">
              {message}
            </p>

            {(metric || supporting) && (
              <div className="rounded-xl bg-white/[0.06] px-3.5 py-2.5 mb-3.5 border border-white/[0.06]">
                {metric && (
                  <p className="text-xs text-white/80 font-semibold">{metric}</p>
                )}
                {supporting && (
                  <p className="text-[11px] text-[#8892A8] mt-0.5">{supporting}</p>
                )}
              </div>
            )}

            <Link
              href={linkHref}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#FF9933] hover:text-[#FF9933]/80 transition-colors group"
            >
              Review Suggestion
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
