import Link from "next/link";

interface QuickActionsProps {
  alertCount: number;
  pendingCount: number;
  campaignCount: number;
  zoneCount: number;
}

const actions = [
  {
    label: "Dead Stock Alerts",
    href: "/demo/alerts",
    countKey: "alertCount" as const,
    iconColor: "#E8453C",
    textColor: "text-[#E8453C]",
    icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  },
  {
    label: "Pending Approvals",
    href: "/demo/alerts",
    countKey: "pendingCount" as const,
    iconColor: "#FF9933",
    textColor: "text-[#FF9933]",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
  },
  {
    label: "Active Campaigns",
    href: "/demo/campaigns",
    countKey: "campaignCount" as const,
    iconColor: "#0066FF",
    textColor: "text-[#0066FF]",
    icon: "M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14",
  },
  {
    label: "Network",
    href: "/demo/network",
    countKey: "zoneCount" as const,
    iconColor: "#10B981",
    textColor: "text-[#10B981]",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z",
  },
];

export function QuickActions({
  alertCount,
  pendingCount,
  campaignCount,
  zoneCount,
}: QuickActionsProps) {
  const counts = { alertCount, pendingCount, campaignCount, zoneCount };

  return (
    <div className="px-4">
      <h2 className="text-sm font-bold text-white mb-3 tracking-tight">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5 hover:border-white/[0.10] active:scale-[0.98] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-2.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={action.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={action.icon} />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-[#8892A8] mb-0.5">{action.label}</p>
            <p className={`text-xl font-extrabold ${action.textColor} tracking-tight`}>{counts[action.countKey]}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
