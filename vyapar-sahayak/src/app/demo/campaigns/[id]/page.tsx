import { getCachedCampaign, getCachedCampaignZones } from "@/lib/cache";
import Link from "next/link";
import { CampaignPreview } from "@/components/dashboard/campaign-preview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function CampaignPage({ params }: any) {
  let id: string;
  try {
    const p = await params;
    id = p.id;
  } catch {
    return <div className="p-6 text-red-500">Failed to read params</div>;
  }

  let campaign;
  try {
    campaign = await getCachedCampaign(id);
  } catch (e) {
    return <div className="p-6 text-red-500 text-xs font-mono whitespace-pre-wrap">Campaign load error: {String(e)}</div>;
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">Campaign not found.</p>
        <Link href="/demo" className="text-sm text-[#FF9933] font-semibold mt-2">
          Back to dashboard
        </Link>
      </div>
    );
  }

  let zones;
  try {
    zones = await getCachedCampaignZones(campaign.distributorId);
  } catch (e) {
    return <div className="p-6 text-red-500 text-xs font-mono whitespace-pre-wrap">Zones load error: {String(e)}</div>;
  }

  const zoneGroups = zones.map((z) => ({
    id: z.id,
    name: z.name,
    code: z.code,
    retailerCount: z._count.retailers,
  }));

  // Parse target groups from campaign
  let targetGroupNames: string[] = [];
  if (campaign.targetGroups) {
    try {
      targetGroupNames = JSON.parse(campaign.targetGroups);
    } catch {
      targetGroupNames = campaign.targetGroups.split(",").map((s: string) => s.trim());
    }
  }

  const isNewlyApproved = campaign.status === "draft";

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4">
      {/* Success banner */}
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

      {/* Campaign preview component */}
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
