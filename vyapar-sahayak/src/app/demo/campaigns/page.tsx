import { getCachedDistributor, getCachedCampaigns } from "@/lib/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function statusConfig(status: string) {
  switch (status) {
    case "sent":
      return { label: "Sent", bg: "bg-[#10B981]/15", text: "text-[#10B981]" };
    case "draft":
      return { label: "Ready", bg: "bg-[#FF9933]/15", text: "text-[#FF9933]" };
    default:
      return { label: status, bg: "bg-white/[0.04]", text: "text-[#8892A8]" };
  }
}

export default async function CampaignsPage() {
  const distributor = await getCachedDistributor();

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm text-[#8892A8]">No data found. Run the seed script first.</p>
      </div>
    );
  }

  const campaigns = await getCachedCampaigns(distributor.id);

  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Top nav */}
      <div className="flex items-center gap-3 px-4">
        <Link
          href="/demo"
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-white flex-1">Campaigns</h1>
        <Badge className="bg-[#FF9933]/15 text-[#FF9933] border-0 text-xs">
          {campaigns.length} total
        </Badge>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 px-4">
        <div className="flex items-center gap-1.5 rounded-full bg-[#10B981]/15 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-xs font-medium text-[#10B981]">{sentCount} sent</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#FF9933]/15 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-[#FF9933]" />
          <span className="text-xs font-medium text-[#FF9933]">{draftCount} ready</span>
        </div>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8892A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#8892A8]">No campaigns yet</p>
          <p className="text-xs text-[#8892A8] mt-1">
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
        <div className="flex flex-col gap-3 px-4">
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
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:border-white/[0.10] transition-colors"
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
                      <p className="text-sm font-semibold text-white truncate flex-1">
                        {campaign.productName}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    {campaign.offerHeadline && (
                      <p className="text-xs text-[#8892A8] truncate mb-1.5">
                        {campaign.offerHeadline}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-[#8892A8]/70">
                      <span>Created {createdDate}</span>
                      {sentDate && <span>Sent {sentDate}</span>}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="flex-shrink-0 mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
