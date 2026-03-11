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
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommend/${alertId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", recommendationId }),
      });

      const data = await res.json();
      if (res.ok && data.campaignId) {
        router.push(`/demo/campaigns/${data.campaignId}`);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
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
        <p className="text-sm text-gray-500">Recommendation rejected. Returning to alerts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      {loading && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
          <p className="text-xs text-orange-600 font-medium">Generating AI recommendation & campaign poster... this may take up to 60 seconds.</p>
        </div>
      )}
    <div className="flex gap-3">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 py-3 rounded-xl bg-[#10B981] text-white text-sm font-semibold hover:bg-[#10B981]/80 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </span>
        ) : "Approve & Launch"}
      </button>
      <button
        onClick={handleReject}
        disabled={loading}
        className="flex-1 py-3 rounded-xl border-2 border-red-400 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
    </div>
  );
}
