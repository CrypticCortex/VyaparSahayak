export const dynamic = "force-dynamic";

import { getCachedDistributor, getCachedCampaigns } from "@/lib/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function statusConfig(status: string) {
  switch (status) {
    case "sent":
      return { label: "Sent", bg: "bg-emerald-50", text: "text-emerald-600" };
    case "draft":
      return { label: "Ready", bg: "bg-orange-50", text: "text-orange-600" };
    default:
      return { label: status, bg: "bg-gray-100", text: "text-gray-500" };
  }
}

export default async function CampaignsPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-gray-500">No data found. Run the seed script first.</p>
      </div>
    );
  }

  const campaigns = await getCachedCampaigns(distributor.id);

  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-4">
      {/* Summary chips */}
      <div className="flex items-center gap-2">
        <Badge className="bg-orange-50 text-[#FF9933] border-0 text-xs">
          {campaigns.length} total
        </Badge>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">{sentCount} sent</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-[#FF9933]" />
          <span className="text-xs font-medium text-orange-600">{draftCount} ready</span>
        </div>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No campaigns yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Approve a recommendation to create your first campaign
          </p>
          <Link
            href="/demo/alerts"
            className="mt-4 text-sm font-semibold text-[#FF9933]"
          >
            View Alerts
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((campaign) => {
            const status = statusConfig(campaign.status);
            const createdDate = new Date(campaign.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            });
            const sentDate = campaign.sentAt
              ? new Date(campaign.sentAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : null;

            return (
              <Link
                key={campaign.id}
                href={`/demo/campaigns/${campaign.id}`}
                className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Poster thumbnail */}
                  {(campaign.posterUrl || campaign.posterUrlAlt) ? (
                    <img
                      src={(campaign.posterUrlAlt || campaign.posterUrl)!}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #FF9933, #E8453C)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                        {campaign.productName}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    {campaign.offerHeadline && (
                      <p className="text-xs text-gray-500 truncate mb-1.5">
                        {campaign.offerHeadline}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>Created {createdDate}</span>
                      {sentDate && <span>Sent {sentDate}</span>}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="flex-shrink-0 mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
