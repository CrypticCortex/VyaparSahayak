// src/lib/ml/insights.ts
// Generates data-driven AI insights from actual scored inventory data

import type { ScoredSKU } from "./scoring";

export interface DashboardInsight {
  message: string;
  metric: string;
  supporting: string;
  alertId?: string;
  type: "bundle" | "reallocate" | "seasonal" | "expiry" | "concentration";
}

function formatVal(v: number): string {
  if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `Rs.${(v / 1000).toFixed(1)}K`;
  return `Rs.${Math.round(v)}`;
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export function generateDashboardInsight(
  alerts: Array<{
    id: string;
    productId: string;
    zoneCode: string;
    score: number;
    riskLevel: string;
    daysSinceLastSale: number;
    daysToExpiry: number;
    stockValue: number;
    recommendationType: string | null;
    recommendationJson: string | null;
  }>,
  scoredSkus?: ScoredSKU[]
): DashboardInsight {
  if (alerts.length === 0) {
    return {
      message: "Your inventory looks clean. No dead stock detected across any zone.",
      metric: "0 at-risk SKUs",
      supporting: "Run a scan to check for new issues.",
      type: "bundle",
    };
  }

  const totalValue = alerts.reduce((s, a) => s + a.stockValue, 0);
  const highRisk = alerts.filter((a) => a.riskLevel === "high");
  const nearExpiry = alerts.filter((a) => a.daysToExpiry < 45 && a.daysToExpiry > 0);

  // Insight 1: Expiry urgency -- items expiring soon with highest value at stake
  if (nearExpiry.length > 0) {
    const expiryValue = nearExpiry.reduce((s, a) => s + a.stockValue, 0);
    const worst = nearExpiry.sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
    const worstRec = worst.recommendationJson ? JSON.parse(worst.recommendationJson) : null;
    const targetZone = worstRec?.targetZone;

    return {
      message: `${nearExpiry.length} items worth ${formatVal(expiryValue)} expire within 45 days. ${
        targetZone
          ? `Reallocate to ${targetZone} where the category still moves -- `
          : "Run flash discounts to recover "
      }${pct(expiryValue, totalValue)} of your total dead stock is at expiry risk.`,
      metric: `${nearExpiry.length} items, ${formatVal(expiryValue)} at risk`,
      supporting: `Worst: ${worst.daysToExpiry}d to expiry, ${formatVal(worst.stockValue)} value. Score: ${worst.score.toFixed(2)}/1.0`,
      alertId: worst.id,
      type: "expiry",
    };
  }

  // Insight 2: Zone concentration -- one zone holding disproportionate dead stock
  const byZone: Record<string, { count: number; value: number }> = {};
  for (const a of alerts) {
    if (!byZone[a.zoneCode]) byZone[a.zoneCode] = { count: 0, value: 0 };
    byZone[a.zoneCode].count++;
    byZone[a.zoneCode].value += a.stockValue;
  }
  const zones = Object.entries(byZone).sort((a, b) => b[1].value - a[1].value);
  const topZone = zones[0];
  const topZoneShare = topZone[1].value / totalValue;

  if (topZoneShare > 0.3 && zones.length > 2) {
    return {
      message: `${topZone[0]} holds ${pct(topZone[1].value, totalValue)} of all dead stock (${formatVal(topZone[1].value)} across ${topZone[1].count} items). Redistribute to zones with active demand -- ${zones.length > 1 ? zones[zones.length - 1][0] : "other zones"} has the least dead stock.`,
      metric: `${topZone[0]}: ${formatVal(topZone[1].value)} (${pct(topZone[1].value, totalValue)})`,
      supporting: `${zones.length} zones affected. Top zone has ${topZone[1].count}/${alerts.length} alerts.`,
      alertId: alerts.find((a) => a.zoneCode === topZone[0])?.id,
      type: "concentration",
    };
  }

  // Insight 3: Bundle opportunity -- find slow movers that could pair with fast movers
  if (scoredSkus && scoredSkus.length > 0) {
    const slowMovers = scoredSkus.filter((s) => s.velocityRatio < 0.3 && s.daysToExpiry > 60);
    const fastMovers = scoredSkus.filter((s) => s.riskLevel === "healthy" && s.avgDailySalesLast30d > 3);

    if (slowMovers.length > 0 && fastMovers.length > 0) {
      // Group slow movers by category
      const byCat: Record<string, ScoredSKU[]> = {};
      for (const s of slowMovers) {
        if (!byCat[s.category]) byCat[s.category] = [];
        byCat[s.category].push(s);
      }
      const topCat = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)[0];
      const catValue = topCat[1].reduce((s, sk) => s + sk.currentStockValue, 0);

      // Find best fast mover to pair with
      const bestPair = fastMovers.sort((a, b) => b.avgDailySalesLast30d - a.avgDailySalesLast30d)[0];
      const recoveryEst = Math.round(catValue * 0.8);

      const matchingAlert = alerts.find((a) => a.productId === topCat[1][0].productId);

      return {
        message: `Bundle ${topCat[1].length} slow-moving ${topCat[0]} items (${formatVal(catValue)}) with ${bestPair.productName} (selling ${bestPair.avgDailySalesLast30d.toFixed(1)} units/day). Similar combos recover ~80% of stuck value.`,
        metric: `${topCat[1].length} ${topCat[0]} SKUs, est. recovery ${formatVal(recoveryEst)}`,
        supporting: `${bestPair.productName} velocity: ${bestPair.avgDailySalesLast30d.toFixed(1)}/day. Slow movers avg ${topCat[1].reduce((s, sk) => s + sk.daysSinceLastSale, 0) / topCat[1].length | 0}d idle.`,
        alertId: matchingAlert?.id,
        type: "bundle",
      };
    }
  }

  // Insight 4: Seasonal opportunity -- check if any categories are about to enter high season
  if (scoredSkus && scoredSkus.length > 0) {
    const seasonalOpp = scoredSkus.filter(
      (s) => s.seasonalIndex < 0.95 && s.nextMonthSeasonalIndex > 1.1 && s.riskLevel !== "healthy"
    );
    if (seasonalOpp.length > 0) {
      const holdValue = seasonalOpp.reduce((s, sk) => s + sk.currentStockValue, 0);
      const categories = [...new Set(seasonalOpp.map((s) => s.category))];

      return {
        message: `${categories.join(", ")} demand jumps next month (seasonal index ${seasonalOpp[0].nextMonthSeasonalIndex.toFixed(1)}x). Hold ${seasonalOpp.length} items worth ${formatVal(holdValue)} -- let seasonal pull clear them naturally instead of discounting now.`,
        metric: `${seasonalOpp.length} items, ${formatVal(holdValue)} to hold`,
        supporting: `Current seasonal index: ${seasonalOpp[0].seasonalIndex.toFixed(1)}x -> next month: ${seasonalOpp[0].nextMonthSeasonalIndex.toFixed(1)}x`,
        alertId: alerts.find((a) => a.productId === seasonalOpp[0].productId)?.id,
        type: "seasonal",
      };
    }
  }

  // Fallback: general high-risk summary with real numbers
  const avgScore = highRisk.reduce((s, a) => s + a.score, 0) / (highRisk.length || 1);
  const avgIdle = highRisk.reduce((s, a) => s + a.daysSinceLastSale, 0) / (highRisk.length || 1);
  const topAlert = highRisk.sort((a, b) => b.stockValue - a.stockValue)[0] || alerts[0];

  return {
    message: `${highRisk.length} high-risk items averaging ${Math.round(avgIdle)} days idle with a combined ${formatVal(totalValue)} stuck. Start with the highest-value items first to maximize recovery.`,
    metric: `${highRisk.length} high-risk, avg score ${avgScore.toFixed(2)}`,
    supporting: `Top item: ${formatVal(topAlert.stockValue)} value, ${topAlert.daysSinceLastSale}d idle, score ${topAlert.score.toFixed(2)}`,
    alertId: topAlert.id,
    type: "reallocate",
  };
}
