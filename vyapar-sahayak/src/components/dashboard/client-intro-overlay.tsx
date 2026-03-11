"use client";

import { useState, useEffect } from "react";
import { AutoSeed } from "./auto-seed";

const INTRO_KEY = "vyapar-intro-seen";

export function ClientIntroOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(INTRO_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#F9FAFB] overflow-y-auto">
      <AutoSeed
        onDone={() => {
          localStorage.setItem(INTRO_KEY, "true");
          setShow(false);
        }}
      />
    </div>
  );
}
