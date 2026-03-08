"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CampaignPreview } from "@/components/dashboard/campaign-preview";

interface CampaignData {
  id: string;
  posterUrl: string | null;
  posterUrlAlt: string | null;
  productName: string;
  offerHeadline: string;
  offerDetails: string;
  whatsappMessage: string;
  distributorId: string;
  status: string;
  sentAt: string | null;
  recommendation: unknown;
}

interface ZoneData {
  id: string;
  name: string;
  code: string;
  _count: { retailers: number };
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/campaign-detail?id=${id}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCampaign(data.campaign);
          setZones(data.zones);
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

  if (notFound || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">Campaign not found.</p>
        <Link href="/demo" className="text-sm text-[#FF9933] font-semibold mt-2">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const zoneGroups = zones.map((z) => ({
    id: z.id,
    name: z.name,
    code: z.code,
    retailerCount: z._count.retailers,
  }));

  const isNewlyApproved = campaign.status === "draft";

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4">
      {isNewlyApproved && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-600">Campaign Ready!</p>
              <p className="text-xs text-emerald-500">
                Recommendation approved. Review and send below.
              </p>
            </div>
          </div>
        </div>
      )}

      {campaign.status === "sent" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-600">Campaign Sent</p>
              <p className="text-xs text-emerald-500">
                Sent on {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString("en-IN") : "recently"}
              </p>
            </div>
          </div>
        </div>
      )}

      <CampaignPreview
        campaignId={campaign.id}
        posterUrl={campaign.posterUrl}
        posterUrlAlt={campaign.posterUrlAlt}
        productName={campaign.productName}
        offerHeadline={campaign.offerHeadline}
        offerDetails={campaign.offerDetails}
        whatsappMessage={campaign.whatsappMessage}
        zoneGroups={zoneGroups}
        status={campaign.status}
      />
    </div>
  );
}
