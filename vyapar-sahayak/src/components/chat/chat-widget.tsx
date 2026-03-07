"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface CampaignCard {
  id: string;
  productName: string;
  status: string;
  posters: string[];
  whatsappMessage?: string;
  offerHeadline?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  campaigns?: CampaignCard[];
}

export function ChatWidget({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Vanakkam! I'm your VyaparSahayak AI assistant. Ask me anything about your inventory, dead stock, or campaigns -- or tell me to take action!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function sendToApi(updatedMessages: Message[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "No response",
          campaigns: data.campaigns || undefined,
        },
      ]);

      // Open WhatsApp if the API says to
      if (data.openWhatsApp && Array.isArray(data.openWhatsApp)) {
        const firstMsg = data.openWhatsApp[0];
        const posterUrl = data.campaigns?.[0]?.posters?.[0];
        if (firstMsg) {
          await shareToWhatsApp(firstMsg, posterUrl);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await sendToApi(updated);
  }

  // Quick action chips
  const chips = [
    "Scan inventory",
    "Show alerts",
    "Dashboard summary",
    "View campaigns",
    "Network overview",
  ];

  if (!open) return null;

  return (
    <>
      {/* Chat panel */}
      {(
        <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[380px] h-[100dvh] sm:h-[520px] bg-[#0A1128] sm:rounded-2xl shadow-2xl z-50 flex flex-col border border-white/[0.06] overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0"
            style={{ background: "linear-gradient(135deg, #FF9933, #E8453C)" }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
                <path d="M17 10v1a5 5 0 0 1-10 0v-1" />
                <circle cx="12" cy="19" r="2" />
                <path d="M12 17v-3" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">VyaparSahayak AI</p>
              <p className="text-[10px] text-white/60">Powered by AWS Bedrock</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-[#FF9933] to-[#E8453C] text-white rounded-br-md"
                        : "bg-white/[0.05] text-white/90 rounded-bl-md"
                    }`}
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>
                {/* Campaign carousels */}
                {msg.campaigns && msg.campaigns.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.campaigns.map((campaign) => (
                      <CampaignCarousel key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#8892A8] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[#8892A8] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[#8892A8] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick chips (only show when few messages) */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    const fakeMsg: Message = { role: "user", content: chip };
                    const updated = [...messages, fakeMsg];
                    setMessages(updated);
                    setInput("");
                    sendToApi(updated);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] text-[#FF9933] hover:bg-[#FF9933]/10 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/[0.06] shrink-0 bg-[#0A1128]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything or give a command..."
                disabled={loading}
                className="flex-1 px-3 py-2.5 text-sm bg-white/[0.05] rounded-xl border border-white/[0.08] text-white placeholder:text-[#8892A8] focus:outline-none focus:border-[#FF9933] focus:ring-1 focus:ring-[#FF9933] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #FF9933, #E8453C)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}




function CampaignCarousel({ campaign }: { campaign: CampaignCard }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const posters = campaign.posters;

  if (posters.length === 0) return null;

  return (
    <div className="bg-[#0A1128] rounded-xl border border-white/[0.06] overflow-hidden max-w-[85%]">
      {/* Poster image with navigation */}
      <div className="relative">
        <div className="relative w-full aspect-square bg-white/[0.03]">
          <Image
            src={posters[activeIndex]}
            alt={`${campaign.productName} poster ${activeIndex + 1}`}
            fill
            className="object-cover"
            sizes="300px"
          />
        </div>

        {/* Nav arrows (only if multiple posters) */}
        {posters.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev === 0 ? posters.length - 1 : prev - 1))}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev === posters.length - 1 ? 0 : prev + 1))}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators */}
        {posters.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {posters.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === activeIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Status badge */}
        <span
          className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            campaign.status === "sent"
              ? "bg-green-500/90 text-white"
              : "bg-amber-500/90 text-white"
          }`}
        >
          {campaign.status === "sent" ? "Sent" : "Draft"}
        </span>
      </div>

      {/* Info */}
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-white truncate">{campaign.productName}</p>
        {campaign.offerHeadline && (
          <p className="text-[10px] text-[#8892A8] mt-0.5 truncate">{campaign.offerHeadline}</p>
        )}
        {/* Provider label */}
        {posters.length > 1 && (
          <p className="text-[9px] text-[#8892A8]/70 mt-1">
            {activeIndex === 0 ? "AWS Nova Canvas" : "Google Gemini"} -- swipe to compare
          </p>
        )}
      </div>
    </div>
  );
}


// Share message + poster image to WhatsApp via Web Share API
async function shareToWhatsApp(message: string, posterUrl?: string) {
  if (posterUrl && navigator.share) {
    try {
      const res = await fetch(posterUrl);
      const blob = await res.blob();
      const ext = posterUrl.endsWith(".png") ? "png" : "jpg";
      const file = new File([blob], `campaign-poster.${ext}`, {
        type: blob.type || `image/${ext}`,
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ text: message, files: [file] });
        return;
      }
    } catch {
      // Share cancelled or failed -- fall through
    }
  }
  // Fallback: text-only WhatsApp link
  const encoded = encodeURIComponent(message);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
}


// Simple markdown-like rendering for bold text
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
