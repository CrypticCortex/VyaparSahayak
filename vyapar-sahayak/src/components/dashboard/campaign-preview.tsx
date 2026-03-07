"use client";

import { useState } from "react";

interface ZoneGroup {
  id: string;
  name: string;
  code: string;
  retailerCount: number;
}

interface CampaignPreviewProps {
  campaignId: string;
  posterUrl: string | null;
  posterUrlAlt: string | null;
  productName: string;
  offerHeadline: string | null;
  offerDetails: string | null;
  whatsappMessage: string | null;
  zoneGroups: ZoneGroup[];
  status?: string;
}

export function CampaignPreview({
  campaignId,
  posterUrl,
  posterUrlAlt,
  productName,
  offerHeadline,
  offerDetails,
  whatsappMessage,
  zoneGroups,
  status,
}: CampaignPreviewProps) {
  const hasBothPosters = posterUrl && posterUrlAlt && posterUrl !== posterUrlAlt;
  const [selectedPoster, setSelectedPoster] = useState<"aws" | "gemini">("gemini");
  const [saving, setSaving] = useState(false);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    new Set(zoneGroups.map((z) => z.id))
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [deliveredGroups, setDeliveredGroups] = useState<Set<string>>(new Set());

  const activePoster = selectedPoster === "aws" ? posterUrl : posterUrlAlt;

  function toggleZone(zoneId: string) {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  }

  const totalRecipients = zoneGroups
    .filter((z) => selectedZones.has(z.id))
    .reduce((sum, z) => sum + z.retailerCount, 0);

  async function handleSelectPoster(choice: "aws" | "gemini") {
    setSelectedPoster(choice);
    setSaving(true);
    try {
      await fetch(`/api/campaign/${campaignId}/select-poster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posterUrl: choice === "aws" ? posterUrl : posterUrlAlt,
        }),
      });
    } catch {
      // silent -- poster selection is best-effort
    }
    setSaving(false);
  }

  async function openWhatsApp() {
    const posterLink = activePoster || posterUrl || posterUrlAlt;
    const msgText = whatsappMessage || `Special offer on ${productName}!`;

    // Try Web Share API with image file (works on mobile + some desktop)
    if (posterLink && navigator.share) {
      try {
        const res = await fetch(posterLink);
        const blob = await res.blob();
        const ext = posterLink.endsWith(".png") ? "png" : "jpg";
        const file = new File([blob], `${productName.replace(/\s+/g, "-")}-offer.${ext}`, {
          type: blob.type || `image/${ext}`,
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text: msgText, files: [file] });
          return;
        }
      } catch {
        // Share cancelled or failed -- fall through to URL fallback
      }
    }

    // Fallback: open WhatsApp with text only
    const encoded = encodeURIComponent(msgText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  }

  function handleSend() {
    setSending(true);
    setDeliveredGroups(new Set());

    // Animate delivering to each selected zone one by one
    const activeZones = zoneGroups.filter((z) => selectedZones.has(z.id));
    activeZones.forEach((zone, i) => {
      setTimeout(() => {
        setDeliveredGroups((prev) => new Set([...prev, zone.id]));
        // After the last group is delivered, open WhatsApp and mark sent
        if (i === activeZones.length - 1) {
          setTimeout(() => {
            openWhatsApp();
            setSending(false);
            setSent(true);
          }, 600);
        }
      }, (i + 1) * 400);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Poster picker -- show when both exist */}
      {hasBothPosters ? (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Choose Poster
            <span className="text-xs font-normal text-[#8892A8] ml-2">
              Pick the best one for your campaign
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* AWS poster */}
            <button
              onClick={() => handleSelectPoster("aws")}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                selectedPoster === "aws"
                  ? "border-[#FF9933] shadow-lg"
                  : "border-white/[0.06] opacity-70"
              }`}
            >
              <img
                src={posterUrl!}
                alt="AWS Nova Canvas poster"
                className="w-full aspect-square object-cover"
              />
              <div className={`absolute bottom-0 inset-x-0 py-1.5 text-center text-xs font-semibold ${
                selectedPoster === "aws"
                  ? "bg-[#FF9933] text-white"
                  : "bg-white/[0.06] text-[#8892A8]"
              }`}>
                AWS Nova Canvas
                {selectedPoster === "aws" && (
                  <svg className="inline-block ml-1 -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>

            {/* Gemini poster */}
            <button
              onClick={() => handleSelectPoster("gemini")}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                selectedPoster === "gemini"
                  ? "border-[#FF9933] shadow-lg"
                  : "border-white/[0.06] opacity-70"
              }`}
            >
              <img
                src={posterUrlAlt!}
                alt="Gemini Nano Banana Pro poster"
                className="w-full aspect-square object-cover"
              />
              <div className={`absolute bottom-0 inset-x-0 py-1.5 text-center text-xs font-semibold ${
                selectedPoster === "gemini"
                  ? "bg-[#FF9933] text-white"
                  : "bg-white/[0.06] text-[#8892A8]"
              }`}>
                Gemini Pro
                {selectedPoster === "gemini" && (
                  <svg className="inline-block ml-1 -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          </div>
          {saving && (
            <p className="text-xs text-[#8892A8] text-center mt-1">Saving selection...</p>
          )}
        </div>
      ) : (
        /* Single poster fallback */
        <div className="px-4">
          {(posterUrl || posterUrlAlt) ? (
            <img
              src={(posterUrl || posterUrlAlt)!}
              alt={`Campaign poster for ${productName}`}
              className="w-full rounded-xl"
            />
          ) : (
            <div
              className="w-full h-64 rounded-xl flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FF9933 0%, #FF9933 30%, #E8453C 70%, #E8453C 100%)",
              }}
            >
              <p className="text-white/60 text-xs mb-2">Campaign Poster</p>
              <p className="text-white text-xl font-bold text-center px-6">
                {offerHeadline || productName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected poster large preview (when picker is active) */}
      {hasBothPosters && activePoster && (
        <div className="px-4">
          <p className="text-xs text-[#8892A8] mb-1">Selected poster preview</p>
          <img
            src={activePoster}
            alt={`Selected ${selectedPoster} poster`}
            className="w-full rounded-xl"
          />
        </div>
      )}

      {/* WhatsApp message preview */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-white mb-2">WhatsApp Message</h3>
        <div className="bg-[#DCF8C6] rounded-xl rounded-tl-sm p-4 max-w-[85%]">
          <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-line">
            {whatsappMessage || `Special offer on ${productName}! Contact your distributor for details.`}
          </p>
          <p className="text-[10px] text-[#757575] text-right mt-2">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Sending animation -- WhatsApp message flying out */}
      {sending && (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Sending to WhatsApp...
          </h3>
          <div className="bg-[#10B981]/15 rounded-xl p-3 border border-[#10B981]/30">
            {/* Mini WhatsApp message preview */}
            <div className="flex gap-2 mb-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white/[0.04]">
                {(activePoster || posterUrl || posterUrlAlt) && (
                  <img
                    src={(activePoster || posterUrl || posterUrlAlt)!}
                    alt="Poster"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#10B981]">{productName}</p>
                <p className="text-[10px] text-[#10B981]/80 truncate">
                  {whatsappMessage?.slice(0, 60) || "Special offer!"}...
                </p>
              </div>
            </div>
            {/* Delivery progress per group */}
            <div className="flex flex-col gap-1.5">
              {zoneGroups.filter((z) => selectedZones.has(z.id)).map((zone) => {
                const delivered = deliveredGroups.has(zone.id);
                return (
                  <div
                    key={zone.id}
                    className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                      delivered ? "text-[#10B981]" : "text-[#8892A8]"
                    }`}
                  >
                    {delivered ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-[#8892A8] border-t-transparent animate-spin" />
                    )}
                    <span className={delivered ? "font-medium" : ""}>{zone.name}</span>
                    <span className="text-[10px]">({zone.retailerCount})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recipient groups */}
      {!sending && (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Recipient Groups
            <span className="text-xs font-normal text-[#8892A8] ml-2">
              {totalRecipients} retailers
            </span>
          </h3>
          <div className="flex flex-col gap-2">
            {zoneGroups.map((zone) => (
              <div
                key={zone.id}
                className={`flex items-center justify-between rounded-xl bg-white/[0.03] border px-4 py-3 transition-colors ${
                  sent && selectedZones.has(zone.id)
                    ? "border-[#10B981]/30 bg-[#10B981]/10"
                    : "border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {sent && selectedZones.has(zone.id) && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{zone.name}</p>
                    <p className="text-xs text-[#8892A8]">
                      {zone.code} * {zone.retailerCount} retailers
                    </p>
                  </div>
                </div>
                {!sent && (
                  <button
                    onClick={() => toggleZone(zone.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      selectedZones.has(zone.id) ? "bg-[#FF9933]" : "bg-white/[0.10]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        selectedZones.has(zone.id) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons -- hide when already sent */}
      {status !== "sent" && (
        <div className="px-4 flex flex-col gap-2 pb-4">
          {sent ? (
            <div className="py-3 rounded-xl bg-[#10B981]/15 text-center">
              <p className="text-sm font-semibold text-[#10B981]">
                Campaign sent to {totalRecipients} retailers!
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleSend}
                disabled={sending || selectedZones.size === 0}
                className="py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#25D366" }}
              >
                {sending ? "Sending..." : `Send Campaign (${totalRecipients} retailers)`}
              </button>
              <button
                onClick={openWhatsApp}
                disabled={sending}
                className="py-3 rounded-xl border-2 border-[#25D366] text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/10 transition-colors disabled:opacity-50"
              >
                Send Preview First
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
