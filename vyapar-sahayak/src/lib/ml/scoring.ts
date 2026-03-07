// src/lib/ml/scoring.ts

import type { SKUFeatures } from "./features";

export interface ScoredSKU extends SKUFeatures {
  deadStockScore: number;
  riskLevel: "high" | "medium" | "watch" | "healthy";
  signals: {
    idleness: number;
    velocityDecline: number;
    overstock: number;
    expiry: number;
    seasonalRisk: number;
    returns: number;
  };
}

const WEIGHTS = {
  idleness: 0.28,
  velocityDecline: 0.22,
  overstock: 0.20,
  expiry: 0.18,
  seasonalRisk: 0.08,
  returns: 0.04,
};

export function scoreDeadStock(features: SKUFeatures[]): ScoredSKU[] {
  return features.map((f) => {
    const signals = {
      // 30+ days idle is concerning, 60+ is critical
      idleness: Math.min(f.daysSinceLastSale / 60, 1.0),
      // velocity dropped to 0 = maximum signal
      velocityDecline: f.velocityRatio < 0.6
        ? Math.min((0.6 - f.velocityRatio) / 0.6, 1.0)
        : 0,
      // 8+ weeks of cover is fully overstocked; 99 weeks = max
      overstock: f.weeksOfCover >= 99
        ? 1.0
        : Math.min(Math.max(f.weeksOfCover - 4, 0) / 8, 1.0),
      // Under 60 days to expiry is urgent
      expiry: f.hasExpiry ? Math.max(0, 1 - f.daysToExpiry / 60) : 0,
      seasonalRisk: f.seasonalIndex < 0.9 ? 0.3 : 0,
      returns: Math.min(f.returnRate / 0.10, 1.0),
    };

    const score = Object.entries(WEIGHTS).reduce(
      (sum, [key, w]) => sum + w * signals[key as keyof typeof signals],
      0
    );

    let riskLevel: ScoredSKU["riskLevel"];
    if (score >= 0.6) riskLevel = "high";
    else if (score >= 0.35) riskLevel = "medium";
    else if (score >= 0.2) riskLevel = "watch";
    else riskLevel = "healthy";

    return { ...f, deadStockScore: Math.round(score * 100) / 100, riskLevel, signals };
  });
}
