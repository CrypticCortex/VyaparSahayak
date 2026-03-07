"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApproveRejectButtonsProps {
  alertId: string;
  recommendationId?: string;
}

export function ApproveRejectButtons({
  alertId,
  recommendationId,
}: ApproveRejectButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejected, setRejected] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recommend/${alertId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", recommendationId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.campaignId) {
          router.push(`/demo/campaigns/${data.campaignId}`);
        } else {
          router.push("/demo/alerts");
        }
      } else {
        // If API not yet implemented, navigate to alerts with feedback
        router.push("/demo/alerts");
      }
    } catch {
      // Fallback navigation
      router.push("/demo/alerts");
    } finally {
      setLoading(false);
    }
  }

  function handleReject() {
    setRejected(true);
    setTimeout(() => {
      router.push("/demo/alerts");
    }, 1000);
  }

  if (rejected) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-[#8892A8]">Recommendation rejected. Returning to alerts...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 py-3 rounded-xl bg-[#10B981] text-white text-sm font-semibold hover:bg-[#10B981]/80 transition-colors disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve & Launch"}
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="flex-1 py-3 rounded-xl border-2 border-[#E8453C] text-[#E8453C] text-sm font-semibold hover:bg-[#E8453C]/10 transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
