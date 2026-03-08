import Link from "next/link";

interface AiInsightProps {
  message: string;
  metric?: string;
  supporting?: string;
  linkHref: string;
}

export function AiInsight({ message, metric, supporting, linkHref }: AiInsightProps) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Saffron top accent */}
      <div className="h-1 bg-gradient-to-r from-[#FF9933] to-[#FF9933]/60" />

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#FF9933]/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-[#FF9933] uppercase tracking-widest">
            AI Insight
          </span>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed mb-3 font-medium">
          {message}
        </p>

        {(metric || supporting) && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 mb-4">
            {metric && (
              <p className="text-xs text-gray-900 font-semibold">{metric}</p>
            )}
            {supporting && (
              <p className="text-[11px] text-gray-500 mt-0.5">{supporting}</p>
            )}
          </div>
        )}

        <Link
          href={linkHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FF9933] hover:text-[#e88a2d] transition-colors group"
        >
          Review Suggestion
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
