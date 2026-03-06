import { prisma } from "@/lib/db";
import type { SuggestionInput } from "./types";
import {
  analyzeRetailerActivity,
  analyzeZoneOrderClusters,
  analyzeLargeOrders,
  analyzeStockVsOrders,
} from "./order-intelligence";
import {
  analyzeIdleVsActive,
  analyzeExpiryUrgency,
  analyzePostOrderDepletion,
} from "./stock-rebalancing";
import {
  analyzeCampaignConversion,
  analyzeZoneConversion,
  analyzePosterPerformance,
} from "./campaign-performance";

export type { SuggestionInput };

function getDedupKey(input: SuggestionInput): string {
  const payload = input.actionPayload;
  let entityId = "";

  switch (input.actionType) {
    case "send_checkin":
      entityId = String(payload.retailerId || "");
      break;
    case "create_batch":
      entityId = String(payload.zoneCode || "");
      break;
    case "send_reminder":
    case "view_campaign":
      entityId = String(payload.campaignId || "");
      break;
    case "confirm_stock":
      entityId = String(payload.orderId || "");
      break;
    case "transfer_stock":
    case "flash_sale":
      entityId = String(payload.productId || "");
      break;
  }

  return `${input.type}:${input.actionType}:${entityId}`;
}

export async function generateSuggestions(distributorId: string) {
  const warnings: string[] = [];

  const analyzers = [
    { name: "retailerActivity", fn: () => analyzeRetailerActivity(distributorId) },
    { name: "zoneOrderClusters", fn: () => analyzeZoneOrderClusters(distributorId) },
    { name: "largeOrders", fn: () => analyzeLargeOrders(distributorId) },
    { name: "stockVsOrders", fn: () => analyzeStockVsOrders(distributorId) },
    { name: "idleVsActive", fn: () => analyzeIdleVsActive(distributorId) },
    { name: "expiryUrgency", fn: () => analyzeExpiryUrgency(distributorId) },
    { name: "postOrderDepletion", fn: () => analyzePostOrderDepletion(distributorId) },
    { name: "campaignConversion", fn: () => analyzeCampaignConversion(distributorId) },
    { name: "zoneConversion", fn: () => analyzeZoneConversion(distributorId) },
    { name: "posterPerformance", fn: () => analyzePosterPerformance(distributorId) },
  ];

  // run all in parallel, catch individual failures
  const results = await Promise.all(
    analyzers.map(async ({ name, fn }) => {
      try {
        return await fn();
      } catch (error) {
        const msg = `Analyzer ${name} failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(msg);
        warnings.push(msg);
        return [] as SuggestionInput[];
      }
    })
  );

  const allInputs = results.flat();

  // get existing pending suggestions for dedup
  const existing = await prisma.agentSuggestion.findMany({
    where: { distributorId, status: "pending" },
    select: { type: true, actionType: true, actionPayload: true },
  });

  const existingKeys = new Set(
    existing.map((s) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(s.actionPayload);
      } catch {
        // ignore parse errors
      }
      return getDedupKey({
        type: s.type as SuggestionInput["type"],
        actionType: s.actionType as SuggestionInput["actionType"],
        actionPayload: payload,
        title: "",
        description: "",
        priority: "medium",
      });
    })
  );

  // filter out duplicates
  const newInputs = allInputs.filter(
    (input) => !existingKeys.has(getDedupKey(input))
  );

  // batch create new suggestions
  const suggestions = await Promise.all(
    newInputs.map((input) =>
      prisma.agentSuggestion.create({
        data: {
          distributorId,
          type: input.type,
          title: input.title,
          description: input.description,
          actionType: input.actionType,
          actionPayload: JSON.stringify(input.actionPayload),
          priority: input.priority,
          status: "pending",
        },
      })
    )
  );

  return { suggestions, warnings };
}
