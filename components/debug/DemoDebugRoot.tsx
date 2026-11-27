"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { AnswerValue, RenderedQuestion } from "@arca/contracts";
import { chooseAnswer } from "@/lib/debug/auto-answer";
import { armedScenario } from "@/lib/debug/scenario";
import { installDebugStore } from "@/lib/debug/store";
import { demoScenarios, recordedAnswer } from "@/lib/demo/replay";
import StatePanel, { type DemoPanel } from "./StatePanel";

// The debug strip of the demo (the `dev` branch's Vercel preview), next to the DemoBar pill, which stays at the bottom. The
// founder reviews the UX there, so the strip folds into a small tab at the top right and the tab remembers its state in
// this browser. There is no back: the State panel works from the recording (lib/demo/replay.ts) — the recorded scenarios,
// the recorded answers — and jumps between the screens. DebugMount loads this file in demo only; a production build never
// emits it, and the sentinel below is what the build's leak check looks for to prove that.
const FOLDED_KEY = "arca.demo.stripFolded";

function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFolded(folded: boolean): void {
  try {
    if (folded) localStorage.setItem(FOLDED_KEY, "1");
    else localStorage.removeItem(FOLDED_KEY);
  } catch {
    // Blocked storage: the strip opens unfolded on the next page load.
  }
}

const DEMO: DemoPanel = {
  scenarios: demoScenarios().map(item => ({ ...item, scenario: item.scenario })),
  choose: (question: RenderedQuestion): AnswerValue => recordedAnswer(question.id) ?? chooseAnswer(question),
};

export default function DemoDebugRoot() {
  const [store] = useState(installDebugStore);
  // Loaded with ssr: false, so reading storage on the first render cannot break hydration.
  const [folded, setFolded] = useState(readFolded);
  const [armed, setArmed] = useState(() => armedScenario(false));
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const refreshArmed = useCallback(() => setArmed(armedScenario(false)), []);
  useEffect(() => store.subscribe(refreshArmed), [store, refreshArmed]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a page change can take the scenario; read it again.
  useEffect(refreshArmed, [pathname, refreshArmed]);

  function fold(next: boolean) {
    setFolded(next);
    writeFolded(next);
    if (next) setOpen(false);
  }

  if (folded) {
    return (
      <button
        type="button"
        data-arca-debug="arca-debug-sentinel-7f3c"
        onClick={() => fold(false)}
        aria-label="Show the debug strip"
        className="fixed top-0 right-3 z-[60] flex items-center gap-1 rounded-b-lg bg-marino px-2.5 py-1 font-body text-[11px] font-semibold text-white shadow"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-oro" />
        Debug
        <ChevronDown className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[60]">
      <div className="flex">
        <div
          data-arca-debug="arca-debug-sentinel-7f3c"
          role="status"
          className="flex min-w-0 flex-1 items-center justify-center gap-2 bg-marino px-2 py-1 text-center font-body text-[11px] leading-4 font-semibold text-white sm:px-4 sm:text-xs"
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-oro" />
          <span>
            DEMO · recorded answers · nothing is saved
            {armed.length > 0 && ` · next scan injects: ${armed.join(", ")}`}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? "arca-debug-panel" : undefined}
          onClick={() => setOpen(value => !value)}
          className="flex shrink-0 items-center gap-1 border-l border-white/20 bg-marino px-3 font-body text-xs font-semibold text-white"
        >
          State
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => fold(true)}
          aria-label="Fold the debug strip"
          className="flex shrink-0 items-center border-l border-white/20 bg-marino px-2 text-white"
        >
          <X className="size-4" />
        </button>
      </div>
      {open && <StatePanel store={store} probe={null} apiUrl="" onScenarioChange={refreshArmed} demo={DEMO} />}
    </div>
  );
}
