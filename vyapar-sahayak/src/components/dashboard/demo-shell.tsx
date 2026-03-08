"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { ChatWidget } from "../chat/chat-widget";

export function DemoShell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <>
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area -- offset by sidebar on desktop */}
      <div
        className="min-h-screen transition-[padding-left] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ paddingLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <TopBar />

        <main className="pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav
          onChatOpen={() => setChatOpen(true)}
          chatActive={chatOpen}
        />
      </div>

      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
