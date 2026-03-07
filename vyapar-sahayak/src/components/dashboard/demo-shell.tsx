"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { ChatWidget } from "../chat/chat-widget";

export function DemoShell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  // Hidden reset shortcut for demo presentations (Ctrl+Shift+R)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        fetch("/api/seed", { method: "DELETE" }).then(() => {
          window.location.href = "/demo";
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <div className="max-w-[480px] mx-auto relative min-h-screen pb-20">
        {/* Demo banner */}
        <div className="sticky top-0 z-40 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 py-2 text-center">
          <p className="text-xs text-[#8892A8] font-medium">
            Live demo with sample data
          </p>
        </div>

        <main>{children}</main>

        <BottomNav
          onChatOpen={() => setChatOpen(true)}
          chatActive={chatOpen}
        />
      </div>

      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
