"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { checkModes, probeBackMode, type BackModeProbe, type DebugMode } from "@/lib/debug/mode-check";
import { installDebugStore } from "@/lib/debug/store";
import ModeBanner from "./ModeBanner";
import StatePanel from "./StatePanel";

// Debug builds only: DebugMount loads this file in mock and live-debug, and a production build never emits it. The
// banner's sentinel attribute is what the build's leak check (scripts/check-no-debug.mjs) looks for to prove that.
const FRONT: DebugMode = process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ? "live-debug" : "mock";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export default function DebugRoot() {
  // Idempotent: it adopts whatever pages published before this lazy chunk loaded, and keeps an existing store.
  const [store] = useState(installDebugStore);
  const [probe, setProbe] = useState<BackModeProbe | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let current = true;
    void probeBackMode(API_URL).then(result => {
      if (current) setProbe(result);
    });
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60]">
      <div className="flex">
        <div className="min-w-0 flex-1">
          <ModeBanner front={FRONT} check={probe && checkModes(FRONT, probe)} />
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? "arca-debug-panel" : undefined}
          onClick={() => setOpen(value => !value)}
          className="flex shrink-0 items-center gap-1 bg-marino px-3 font-body text-xs font-semibold text-white"
        >
          State
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {open && <StatePanel store={store} probe={probe} apiUrl={API_URL} />}
    </div>
  );
}
