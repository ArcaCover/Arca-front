"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { checkModes, probeBackMode, type BackModeProbe, type DebugMode } from "@/lib/debug/mode-check";
import { armedScenario } from "@/lib/debug/scenario";
import { installDebugStore } from "@/lib/debug/store";
import ModeBanner from "./ModeBanner";
import StatePanel from "./StatePanel";

// Debug builds only: DebugMount loads this file in mock and live-debug, and a production build never emits it. The
// banner's sentinel attribute is what the build's leak check (scripts/check-no-debug.mjs) looks for to prove that.
const FRONT: DebugMode = process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ? "live-debug" : "mock";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
// The back can be restarted in another mode while this tab stays open (DN-09 §2): the strip asks again this often.
const REPROBE_MS = 10_000;

const sameProbe = (a: BackModeProbe | null, b: BackModeProbe) => JSON.stringify(a) === JSON.stringify(b);
const sameList = (a: readonly string[], b: readonly string[]) => a.join("\n") === b.join("\n");

export default function DebugRoot() {
  // Idempotent: it adopts whatever pages published before this lazy chunk loaded, and keeps an existing store.
  const [store] = useState(installDebugStore);
  const [probe, setProbe] = useState<BackModeProbe | null>(null);
  // Loaded with ssr: false, so reading the tab's storage on the first render cannot break hydration.
  const [armed, setArmed] = useState(() => armedScenario(FRONT === "live-debug"));
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const refreshArmed = useCallback(() => {
    const next = armedScenario(FRONT === "live-debug");
    setArmed(current => (sameList(current, next) ? current : next));
  }, []);

  // A page publishes after each scan start, which is when the bridge takes the scenario.
  useEffect(() => store.subscribe(refreshArmed), [store, refreshArmed]);

  // Asks the back on mount, on every page change, when the tab regains focus or becomes visible, and every 10 s while
  // it is visible. While a probe is in flight the strip keeps the last confirmed state; any change shows at once.
  useEffect(() => {
    let current = true;
    let inFlight = false;
    const tick = () => {
      if (inFlight) return;
      inFlight = true;
      void probeBackMode(API_URL).then(result => {
        inFlight = false;
        if (!current) return;
        setProbe(previous => (sameProbe(previous, result) ? previous : result));
        refreshArmed();
      });
    };
    const whenVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", whenVisible);
    const interval = setInterval(whenVisible, REPROBE_MS);
    return () => {
      current = false;
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", whenVisible);
      clearInterval(interval);
    };
  }, [pathname, refreshArmed]);

  return (
    <div className="fixed inset-x-0 top-0 z-[60]">
      <div className="flex">
        <div className="min-w-0 flex-1">
          <ModeBanner front={FRONT} check={probe && checkModes(FRONT, probe)} armed={armed} />
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
      {open && <StatePanel store={store} probe={probe} apiUrl={API_URL} onScenarioChange={refreshArmed} />}
    </div>
  );
}
