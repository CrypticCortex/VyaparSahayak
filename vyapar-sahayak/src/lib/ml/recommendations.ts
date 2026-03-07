// src/lib/ml/recommendations.ts

import type { ScoredSKU } from "./scoring";

export interface RecommendationResult {
  type: "reallocate" | "bundle" | "price_off" | "monitor";
  targetZone?: string;
  bundleWithSku?: string;
  bundleWithName?: string;
  discountPct?: number;
  estimatedRecovery: number;
  rationale: string;
  urgency: "immediate" | "this_week" | "this_month";
}

function formatValue(value: number): string {
  if (value >= 100000) return `Rs.${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `Rs.${(value / 1000).toFixed(1)}K`;
  return `Rs.${Math.round(value)}`;
}

export function generateRecommendation(
  sku: ScoredSKU,
  allScoredSkus: ScoredSKU[]
): RecommendationResult {
  // Near expiry (< 45 days) with any meaningful stock -> reallocate urgently
  if (sku.daysToExpiry < 45 && sku.daysToExpiry > 0 && sku.currentStock > 10) {
    // Find a zone where this product's category is still selling
    const sameCategorySelling = allScoredSkus.filter(
      (s) =>
        s.category === sku.category &&
        s.zoneCode !== sku.zoneCode &&
        s.avgDailySalesLast90d > 0
    );
    const bestZone = sameCategorySelling.sort(
      (a, b) => b.avgDailySalesLast90d - a.avgDailySalesLast90d
    )[0];

    const zoneNames: Record<string, string> = {
      "TN-URB": "Urban Tirunelveli",
      "TN-TWN": "Tirunelveli Town",
      "TN-NAN": "Nanguneri",
      "TN-AMB": "Ambasamudram",
    };

    const targetZone = bestZone?.zoneCode || "TN-URB";
    return {
      type: "reallocate",
      targetZone,
      estimatedRecovery: Math.round(sku.currentStockValue * 0.7),
      rationale: `${sku.productName} expires in ${sku.daysToExpiry} days with ${formatValue(sku.currentStockValue)} stuck across ${sku.currentStock} units. Move to ${zoneNames[targetZone] || targetZone} where ${sku.category} still has demand. Act before expiry wipes out the entire value.`,
      urgency: "immediate",
    };
  }

  // Zero velocity + long shelf life -> bundle with a fast-mover
  if (sku.velocityRatio < 0.3 && sku.daysToExpiry > 60) {
    // Find best fast-mover in same or related category
    const fastMovers = allScoredSkus.filter(
      (s) =>
        s.riskLevel === "healthy" &&
        s.avgDailySalesLast30d > 3 &&
        s.zoneCode === sku.zoneCode
    );
    const bestBundle = fastMovers.sort(
      (a, b) => b.avgDailySalesLast30d - a.avgDailySalesLast30d
    )[0];

    const bundleName = bestBundle?.productName || "a fast-selling SKU";
    return {
      type: "bundle",
      bundleWithSku: bestBundle?.sku,
      bundleWithName: bundleName,
      discountPct: 20,
      estimatedRecovery: Math.round(sku.currentStockValue * 0.8),
      rationale: `${sku.productName} has zero movement in last 30 days but ${sku.daysToExpiry} days of shelf life left. Create a combo pack with ${bundleName} at 20% off to drive trial and clear ${sku.currentStock} units (${formatValue(sku.currentStockValue)}).`,
      urgency: "this_week",
    };
  }

  // Off-season but recovery coming next month -> monitor
  if (sku.seasonalIndex < 0.9 && sku.nextMonthSeasonalIndex > 1.1) {
    return {
      type: "monitor",
      estimatedRecovery: Math.round(sku.currentStockValue * 0.95),
      rationale: `${sku.productName} is in seasonal lull (demand index: ${sku.seasonalIndex}x). Next month jumps to ${sku.nextMonthSeasonalIndex}x -- hold stock and let seasonal demand recover naturally. No action needed yet.`,
      urgency: "this_month",
    };
  }

  // Default -> targeted price discount
  const discountPct = sku.daysToExpiry < 90 ? 20 : 15;
  return {
    type: "price_off",
    discountPct,
    estimatedRecovery: Math.round(sku.currentStockValue * (1 - discountPct / 100)),
    rationale: `${sku.productName} has been slow-moving for ${sku.daysSinceLastSale} days with ${sku.currentStock} units (${formatValue(sku.currentStockValue)}) in stock. Launch ${discountPct}% off flash sale targeting retailers in this zone to accelerate clearance.`,
    urgency: "this_week",
  };
}
