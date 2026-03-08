import { getCachedAlert, getCachedProduct, getCachedZones } from "@/lib/cache";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { ApproveRejectButtons } from "./approve-reject-buttons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecommendationPage({ params }: PageProps) {
  const { id } = await params;

  let alert;
  try {
    alert = await getCachedAlert(id);
  } catch (e) {
    return <div className="p-6 text-red-500 text-xs font-mono whitespace-pre-wrap">Alert load error: {String(e)}</div>;
  }

  if (!alert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">Alert not found.</p>
        <Link href="/demo/alerts" className="text-sm text-[#FF9933] font-semibold mt-2">
          Back to alerts
        </Link>
      </div>
    );
  }

  let product, zones, existingRec;
  try {
    product = await getCachedProduct(alert.productId);
    zones = await getCachedZones(alert.distributorId);
    existingRec = await prisma.recommendation.findFirst({
      where: { alertId: id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    return <div className="p-6 text-red-500 text-xs font-mono whitespace-pre-wrap">Data load error: {String(e)}</div>;
  }
  const existingCampaign = existingRec?.campaign || null;

  // Parse recommendation JSON from alert (includes ML + optional LLM fields)
  interface RecData {
    type: string;
    targetZone?: string;
    bundleWithName?: string;
    discountPct?: number;
    estimatedRecovery: number;
    rationale: string;
    urgency: string;
    aiProblem?: string;
    aiSolution?: string;
    aiRationale?: string;
    aiUrgency?: string;
    aiRecoverySteps?: string[];
  }
  let rec: RecData | null = null;
  if (alert.recommendationJson) {
    try {
      rec = JSON.parse(alert.recommendationJson);
    } catch {
      // ignore
    }
  }

  const formatVal = (v: number) =>
    v >= 100000 ? `Rs.${(v / 100000).toFixed(1)}L` :
    v >= 1000 ? `Rs.${(v / 1000).toFixed(1)}K` :
    `Rs.${Math.round(v)}`;

  const productName = product?.name || "Product";

  // Use LLM-generated text when available, fall back to ML templates
  const problem = rec?.aiProblem ||
    `${productName} has been idle for ${alert.daysSinceLastSale} days with ${formatVal(alert.stockValue)} stuck in inventory across ${alert.zoneCode}.${alert.daysToExpiry < 90 ? ` Expiry in ${alert.daysToExpiry} days adds urgency.` : ""}`;

  const solution = rec?.aiSolution || (
    rec?.type === "reallocate"
      ? `Move stock to ${rec.targetZone || "a higher-demand zone"} where this category still sells. Recover ${formatVal(rec.estimatedRecovery)} before expiry.`
      : rec?.type === "bundle"
        ? `Create combo pack with ${rec.bundleWithName || "a fast-moving item"} at ${rec.discountPct || 20}% off to drive clearance.`
        : rec?.type === "monitor"
          ? `Hold stock -- seasonal demand is expected to recover next month. No action needed yet.`
          : `Launch ${rec?.discountPct || 15}% off flash sale targeting retailers in this zone to accelerate clearance.`
  );

  const rationale = rec?.aiRationale || rec?.rationale ||
    "AI analysis of sales velocity, inventory age, and zone performance suggests this approach maximizes recovery.";

  const affectedZones = rec?.targetZone
    ? [rec.targetZone, alert.zoneCode, ...zones.slice(0, 2).map((z) => z.code)].filter((v, i, a) => a.indexOf(v) === i)
    : [alert.zoneCode];

  const recoveryValue = rec?.estimatedRecovery || alert.stockValue * 0.65;
  const recoverySteps = rec?.aiRecoverySteps;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Product info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{product?.name || "Product"}</p>
          <p className="text-xs text-gray-500">
          {alert.zoneCode} * {alert.daysSinceLastSale}d idle * Score: {alert.score.toFixed(1)}
        </p>
        </div>
        <Badge className="bg-orange-50 text-[#FF9933] border-0 text-xs font-semibold">
          {alert.riskLevel}
        </Badge>
      </div>

      {/* Poster preview */}
      <div>
        {existingCampaign?.posterUrl ? (
          <div className="space-y-2">
            <img
              src={existingCampaign.posterUrl}
              alt={`Campaign poster for ${productName}`}
              className="w-full rounded-xl"
            />
            {existingCampaign.posterUrlAlt && existingCampaign.posterUrlAlt !== existingCampaign.posterUrl && (
              <img
                src={existingCampaign.posterUrlAlt}
                alt={`Alternate poster for ${productName}`}
                className="w-full rounded-xl"
              />
            )}
          </div>
        ) : (
          <div
            className="rounded-xl h-48 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)",
            }}
          >
            <div className="text-center">
              <p className="text-white/80 text-xs mb-1">Generated Poster Preview</p>
              <p className="text-white text-lg font-bold">{product?.name || "Product"}</p>
              <p className="text-white/70 text-sm">Special Offer Campaign</p>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation details */}
      <div>
        <RecommendationCard
          problem={problem}
          solution={solution}
          rationale={rationale}
          affectedZones={affectedZones}
          costValue={alert.stockValue}
          recoveryValue={recoveryValue}
          recoverySteps={recoverySteps}
        />
      </div>

      {/* Action buttons */}
      <div>
        {existingCampaign ? (
          <Link
            href={`/demo/campaigns/${existingCampaign.id}`}
            className="block w-full py-3 rounded-xl bg-[#FF9933] text-white text-sm font-semibold text-center hover:bg-[#FF9933]/80 transition-colors"
          >
            View Campaign{existingCampaign.status === "sent" ? " (Sent)" : ""}
          </Link>
        ) : (
          <ApproveRejectButtons
            alertId={alert.id}
            recommendationId={alert.id}
          />
        )}
      </div>
    </div>
  );
}
