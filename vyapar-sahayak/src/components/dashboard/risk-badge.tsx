interface RiskBadgeProps {
  level: string;
}

const riskConfig: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-50", text: "text-red-600", label: "High Risk" },
  medium: { bg: "bg-amber-50", text: "text-amber-600", label: "Medium Risk" },
  low: { bg: "bg-green-50", text: "text-green-600", label: "Watch" },
  watch: { bg: "bg-green-50", text: "text-green-600", label: "Watch" },
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const config = riskConfig[level.toLowerCase()] ?? riskConfig.medium;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
