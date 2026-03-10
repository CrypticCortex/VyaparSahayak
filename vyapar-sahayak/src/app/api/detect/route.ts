// src/app/api/detect/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFeatures } from "@/lib/ml/features";
import { scoreDeadStock } from "@/lib/ml/scoring";
import { generateRecommendation } from "@/lib/ml/recommendations";
import { enrichAlertsWithLLM } from "@/lib/ml/enrich";
import { invalidateAfterDetection } from "@/lib/cache";

export async function POST() {
  try {
    const distributor = await prisma.distributor.findFirst();
    if (!distributor) {
      return NextResponse.json(
        { error: "No distributor found. Run seed first." },
        { status: 400 }
      );
    }

    // Clear existing alerts
    await prisma.deadStockAlert.deleteMany({ where: { distributorId: distributor.id } });

    // Extract features and score
    const features = await extractFeatures(distributor.id);
    const scored = scoreDeadStock(features);

    // Filter to items that need attention
    const atRisk = scored.filter((s) => s.riskLevel !== "healthy");

    // Generate recommendations and save alerts
    const alerts = [];
    const enrichmentData = [];
    for (const sku of atRisk) {
      const rec = generateRecommendation(sku, scored);

      const alert = await prisma.deadStockAlert.create({
        data: {
          distributorId: distributor.id,
          productId: sku.productId,
          zoneCode: sku.zoneCode,
          score: sku.deadStockScore,
          riskLevel: sku.riskLevel,
          daysSinceLastSale: sku.daysSinceLastSale,
          weeksOfCover: sku.weeksOfCover,
          velocityRatio: sku.velocityRatio,
          daysToExpiry: sku.daysToExpiry,
          stockValue: sku.currentStockValue,
          recommendationType: rec.type,
          recommendationJson: JSON.stringify(rec),
        },
      });
      alerts.push({ ...alert, recommendation: rec });

      enrichmentData.push({
        id: alert.id,
        productName: sku.productName,
        productBrand: sku.brand,
        productCategory: sku.category,
        zoneCode: sku.zoneCode,
        score: sku.deadStockScore,
        riskLevel: sku.riskLevel,
        daysSinceLastSale: sku.daysSinceLastSale,
        daysToExpiry: sku.daysToExpiry,
        weeksOfCover: sku.weeksOfCover,
        velocityRatio: sku.velocityRatio,
        stockValue: sku.currentStockValue,
        currentStock: sku.currentStock,
        mlRecommendation: rec,
      });
    }

    // Enrich with LLM-generated problem/solution/rationale (best-effort, non-blocking)
    enrichAlertsWithLLM(enrichmentData).catch((err) =>
      console.error("LLM enrichment failed:", err)
    );

    // Summary stats
    const totalDeadStockValue = atRisk.reduce((s, a) => s + a.currentStockValue, 0);
    const highRisk = atRisk.filter((a) => a.riskLevel === "high").length;
    const mediumRisk = atRisk.filter((a) => a.riskLevel === "medium").length;

    invalidateAfterDetection();

    return NextResponse.json({
      success: true,
      summary: {
        totalItems: scored.length,
        atRiskItems: atRisk.length,
        highRisk,
        mediumRisk,
        totalDeadStockValue: Math.round(totalDeadStockValue),
        totalDeadStockValueFormatted: `Rs.${(totalDeadStockValue / 100000).toFixed(1)}L`,
      },
      alerts: alerts.slice(0, 20),
    });
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
