"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/demo": "Dashboard",
  "/demo/alerts": "Alerts",
  "/demo/campaigns": "Campaigns",
  "/demo/network": "Network",
  "/demo/orders": "Orders",
  "/demo/orders/batches": "Dispatch Batches",
  "/demo/import": "Import Data",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Check prefix matches for dynamic routes
  if (pathname.startsWith("/demo/recommendations")) return "Recommendation";
  if (pathname.startsWith("/demo/campaigns/")) return "Campaign Detail";
  if (pathname.startsWith("/demo/orders/batches")) return "Dispatch Batches";
  return "Dashboard";
}

const ROLE_COLORS: Record<string, string> = {
  distributor: "bg-[#FF9933]/10 text-[#FF9933]",
  salesman: "bg-blue-50 text-blue-600",
  kirana: "bg-emerald-50 text-emerald-600",
};

interface TopBarProps {
  ownerName?: string;
  role?: string;
}

export function TopBar({ ownerName = "Kalyan", role }: TopBarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Left: Page title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Role badge */}
          {role && (
            <span className={`hidden sm:inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[role] || "bg-gray-100 text-gray-500"}`}>
              {role}
            </span>
          )}

          {/* Demo badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Demo
          </span>

          {/* Notification bell */}
          <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF9933]/10 flex items-center justify-center">
              <span className="text-xs font-bold text-[#FF9933]">
                {ownerName.charAt(0)}
              </span>
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {ownerName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
