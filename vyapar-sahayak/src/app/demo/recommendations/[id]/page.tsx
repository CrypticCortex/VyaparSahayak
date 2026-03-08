"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RecommendationCard } from "@/components/dashboard/recommendation-card";
import { ApproveRejectButtons } from "./approve-reject-buttons";

interface AlertData {
  id: string;
  productId: string;
  distributorId: string;
  zoneCode: string;
  daysSinceLastSale: number;
  daysToExpiry: number;
  stockValue: number;
  score: number;
  riskLevel: string;
  recommendationJson: string | null;
}

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

interface ExistingRec {
  id: string;
  alertId: string;
  campaign: {
    id: string;
    posterUrl: string | null;
    posterUrlAlt: string | null;
    status: string;
  } | null;
}

export default function RecommendationPage() {
  const { id } = useParams<{ id: string }>();
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [productName, setProductName] = useState("Product");
  const [zones, setZones] = useState<{ name: string; code: string }[]>([]);
  const [existingRec, setExistingRec] = useState<ExistingRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/recommendation-detail?id=${id}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setAlert(data.alert);
          setProductName(data.product?.name || "Product");
          setZones(data.zones || []);
          setExistingRec(data.existingRec || null);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#FF9933] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !alert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">Alert not found.</p>
        <Link href="/demo/alerts" className="text-sm text-[#FF9933] font-semibold mt-2">
          Back to alerts
        </Link>
      </div>
    );
  }

  const existingCampaign = existingRec?.campaign || null;

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{productName}</p>
          <p className="text-xs text-gray-500">
            {alert.zoneCode} * {alert.daysSinceLastSale}d idle * Score: {alert.score.toFixed(1)}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-orange-50 text-[#FF9933] border-0 text-xs font-semibold px-2 py-0.5">
          {alert.riskLevel}
        </span>
      </div>

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
            style={{ background: "linear-gradient(135deg, #FF9933 0%, #E8453C 100%)" }}
          >
            <div className="text-center">
              <p className="text-white/80 text-xs mb-1">Generated Poster Preview</p>
              <p className="text-white text-lg font-bold">{productName}</p>
              <p className="text-white/70 text-sm">Special Offer Campaign</p>
            </div>
          </div>
        )}
      </div>

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
