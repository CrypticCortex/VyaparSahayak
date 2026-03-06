// Two-tier autonomy classification for agent tools

export const AUTO_EXECUTE_TOOLS = new Set([
  "get_dashboard_summary",
  "scan_inventory",
  "get_alerts",
  "get_alert_detail",
  "generate_recommendation",
  "get_campaigns",
  "get_campaign_detail",
  "get_whatsapp_groups",
  "auto_handle_dead_stock",
  "get_network_overview",
  "get_pending_orders",
  "suggest_dispatch_batch",
  "check_retailer_activity",
  "get_campaign_performance",
  "send_campaign_reminder",
]);

export const NEEDS_APPROVAL_TOOLS = new Set([
  "send_campaign",
  "create_dispatch_batch",
  "confirm_order",
  "reject_order",
]);

export function isSuggestionResult(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  return (result as Record<string, unknown>).type === "suggestion";
}
