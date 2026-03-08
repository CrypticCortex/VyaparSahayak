"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavProps = {
  onChatOpen?: () => void;
  chatActive?: boolean;
};

const navItems = [
  {
    label: "Home",
    href: "/demo",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/demo/alerts",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Campaigns",
    href: "/demo/campaigns",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ),
  },
  {
    label: "Network",
    href: "/demo/network",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/demo/orders",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
];

export function BottomNav({ onChatOpen, chatActive }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 lg:hidden">
      <div className="flex items-center justify-around py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/demo"
              ? pathname === "/demo"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                isActive && !chatActive
                  ? "text-[#FF9933]"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              {isActive && !chatActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-[#FF9933]" />
              )}
              <span className={isActive && !chatActive ? "text-[#FF9933]" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}

        {/* Chat nav item */}
        <button
          onClick={onChatOpen}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-semibold transition-colors ${
            chatActive
              ? "text-[#FF9933]"
              : "text-gray-400 active:text-gray-600"
          }`}
        >
          {chatActive && (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-[#FF9933]" />
          )}
          <span className={chatActive ? "text-[#FF9933]" : "text-gray-400"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          Chat
        </button>
      </div>
    </nav>
  );
}
