// src/lib/ml/enrich.ts
// LLM-powered enrichment of dead stock recommendations
// Generates rich problem/solution/rationale text backed by ML data

import { generateText } from "@/lib/bedrock";
import { prisma } from "@/lib/db";

interface AlertForEnrichment {
  id: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  zoneCode: string;
  score: number;
  riskLevel: string;
  daysSinceLastSale: number;
  daysToExpiry: number;
  weeksOfCover: number;
  velocityRatio: number;
  stockValue: number;
  currentStock: number;
  mlRecommendation: {
    type: string;
    targetZone?: string;
    bundleWithName?: string;
    discountPct?: number;
    estimatedRecovery: number;
    rationale: string;
    urgency: string;
  };
}

interface EnrichedFields {
  aiProblem: string;
  aiSolution: string;
  aiRationale: string;
  aiUrgency: string;
  aiRecoverySteps: string[];
}

export async function enrichAlertsWithLLM(
  alerts: AlertForEnrichment[]
): Promise<void> {
  if (alerts.length === 0) return;

  // Batch alerts into groups of 10 for the LLM
  const batchSize = 5;
  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize);
    await enrichBatch(batch);
  }
}


async function enrichBatch(alerts: AlertForEnrichment[]): Promise<void> {
  const alertSummaries = alerts.map((a, idx) => `
ALERT ${idx + 1} (id: ${a.id}):
- Product: ${a.productName} (${a.productBrand}, ${a.productCategory})
- Zone: ${a.zoneCode}
- Risk: ${a.riskLevel} (score ${a.score.toFixed(2)}/1.0)
- Idle: ${a.daysSinceLastSale} days since last sale
- Expiry: ${a.daysToExpiry} days remaining
- Stock: ${a.currentStock} units worth Rs.${Math.round(a.stockValue).toLocaleString("en-IN")}
- Weeks of cover: ${a.weeksOfCover >= 99 ? "infinite (zero sales)" : a.weeksOfCover.toFixed(1) + " weeks"}
- Velocity ratio (30d vs 90d): ${a.velocityRatio.toFixed(2)}
- ML recommendation: ${a.mlRecommendation.type}${a.mlRecommendation.targetZone ? ` -> ${a.mlRecommendation.targetZone}` : ""}${a.mlRecommendation.bundleWithName ? ` with ${a.mlRecommendation.bundleWithName}` : ""}${a.mlRecommendation.discountPct ? ` at ${a.mlRecommendation.discountPct}% off` : ""}
- ML estimated recovery: Rs.${Math.round(a.mlRecommendation.estimatedRecovery).toLocaleString("en-IN")}
- ML urgency: ${a.mlRecommendation.urgency}`).join("\n");

  const prompt = `You are an expert FMCG inventory analyst for distributors in Tamil Nadu, India. Analyze these dead stock alerts and write clear, actionable recommendations.

For EACH alert, generate:
1. problem: 2-3 sentences describing the problem. Reference specific numbers (days idle, stock value, velocity drop, expiry timeline). Explain WHY this is a problem for the distributor's cash flow.
2. solution: 2-3 sentences with the specific action to take. Include target zones, bundle partners, or discount percentages from the ML data. Quantify the expected outcome.
3. rationale: 2-3 sentences explaining the analytical reasoning. Reference velocity ratios, seasonal patterns, zone demand differences, or competitive dynamics. This should read like an analyst's note.
4. urgency: One short phrase (e.g., "Act within 48 hours", "This week", "Monitor next 2 weeks")
5. recoverySteps: 3-4 concrete steps the distributor should take, in order.

Context: These distributors manage FMCG products (soaps, snacks, beverages, etc.) across 6 zones in Tirunelveli district. They sell to kirana (mom-and-pop) retailers via WhatsApp.

${alertSummaries}

Respond with ONLY a valid JSON array. Each element must have: { "id": "alert_id", "problem": "...", "solution": "...", "rationale": "...", "urgency": "...", "recoverySteps": ["step1", "step2", "step3"] }`;

  try {
    console.log(`[enrich] Calling LLM for batch of ${alerts.length} alerts...`);
    const response = await generateText(prompt);
    console.log(`[enrich] LLM response length: ${response.length} chars`);

    let enriched: Array<{
      id: string;
      problem: string;
      solution: string;
      rationale: string;
      urgency: string;
      recoverySteps: string[];
    }>;

    try {
      // Try parsing the response -- handle markdown code fences
      const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      enriched = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse LLM enrichment response:", parseErr);
      console.error("Raw response (first 500 chars):", response.slice(0, 500));
      return;
    }

    // Update each alert's recommendationJson with LLM fields
    for (const item of enriched) {
      const alert = alerts.find((a) => a.id === item.id);
      if (!alert) continue;

      const existing = alert.mlRecommendation;
      const updated = {
        ...existing,
        aiProblem: item.problem,
        aiSolution: item.solution,
        aiRationale: item.rationale,
        aiUrgency: item.urgency,
        aiRecoverySteps: item.recoverySteps,
      };

      await prisma.deadStockAlert.update({
        where: { id: item.id },
        data: { recommendationJson: JSON.stringify(updated) },
      });
    }
  } catch (error) {
    // LLM enrichment is best-effort -- don't fail detection if it errors
    console.error("[enrich] LLM enrichment failed for batch:", error);
  }
}
