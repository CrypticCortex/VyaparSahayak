export interface SuggestionInput {
  type: "order_intelligence" | "stock_rebalance" | "campaign_performance";
  title: string;
  description: string;
  actionType:
    | "send_checkin"
    | "create_batch"
    | "send_reminder"
    | "transfer_stock"
    | "flash_sale"
    | "view_campaign"
    | "confirm_stock";
  actionPayload: Record<string, unknown>;
  priority: "high" | "medium" | "low";
}
