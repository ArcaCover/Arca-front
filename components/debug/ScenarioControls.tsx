"use client";

import { DEBUG_PRESETS, DEBUG_REQUEST_HEADER, DebugScenario, isInjected } from "@arca/contracts/debug";
import { useId, useState } from "react";

import { SCENARIO_STORAGE_KEY } from "@/lib/debug/bridge";
import { AXES, DEFAULT_SCENARIO as DEFAULTS, forMode, injectedAxes, valueOf, type AxisKey } from "@/lib/debug/scenario";

// The faults for the next POST /scan (DN-09 §5.3, §6.4). The scenario lives in this tab's sessionStorage until the
// bridge takes it for that one scan. Presets only fill the axes: the scan's outcome still comes out of the real pipeline.
// In live-debug latency does not exist: it is dropped on read, on every change and before it is stored.

function withValue(scenario: DebugScenario, key: AxisKey, value: string, live: boolean): DebugScenario {
  const [group, field] = key.split(".");
  const next = field ? { ...scenario, http: { ...scenario.http, [field]: value } } : { ...scenario, [group]: value };
  return forMode(DebugScenario.parse(next), live);
}

// Only a scenario that injects something is kept, so the real behaviour sends no header at all.
function save(scenario: DebugScenario, live: boolean): void {
  const applied = forMode(scenario, live);
  try {
    if (isInjected(applied)) sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(applied));
    else sessionStorage.removeItem(SCENARIO_STORAGE_KEY);
  } catch {
    // Blocked storage: the bridge cannot read it either, so no scenario travels.
  }
}

function readStored(live: boolean): DebugScenario {
  try {
    const raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (raw === null) return DEFAULTS;
    const parsed = DebugScenario.safeParse(JSON.parse(raw));
    if (parsed.success) {
      const applied = forMode(parsed.data, live);
      // A latency left over from mock is dropped from the tab too, so the header and this panel agree.
      if (applied !== parsed.data) save(applied, live);
      return applied;
    }
  } catch {
    // Blocked storage or a value that is not JSON: treated as unreadable, below.
  }
  // The back answers 400 to a scenario it cannot read, so one this build cannot read is dropped rather than sent.
  save(DEFAULTS, live);
  return DEFAULTS;
}

// React tracks `input.value` to tell its own updates from the user's. Setting the value through the prototype's setter
// bypasses that tracking, so the `input` event that follows reaches onChange exactly as typing would.
function typeInto(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const PRIMARY = "rounded-full bg-marino px-3 py-1 font-semibold text-white";
const SECONDARY = "rounded-full border border-marino px-3 py-1 font-semibold";

type Props = {
  apiUrl: string;
  /** Called after every change to the stored scenario, so the strip can show what the next scan injects. */
  onScenarioChange?: () => void;
};

export default function ScenarioControls({ apiUrl, onScenarioChange }: Props) {
  // In live-debug the default branch of each axis is the real source, and latency does not apply.
  const live = process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug";
  const id = useId();
  // Read once, on mount: the panel only ever renders in the browser (DebugMount loads it with ssr: false).
  const [scenario, setScenario] = useState(() => readStored(live));
  const [notice, setNotice] = useState<string | null>(null);

  function apply(next: DebugScenario) {
    const applied = forMode(next, live);
    save(applied, live);
    setScenario(applied);
    onScenarioChange?.();
  }

  function fillMockFirm() {
    const email = document.querySelector<HTMLInputElement>('input[aria-label="Work email"]');
    const domain = document.querySelector<HTMLInputElement>('input[aria-label="Firm website"]');
    if (!email || !domain) {
      setNotice("The quote form is not on this page");
      return;
    }
    typeInto(email, `debug+${Date.now()}@arca.example`);
    typeInto(domain, "robust.arca.example");
    setNotice(null);
  }

  async function resetLimits() {
    setNotice("Resetting…");
    try {
      // The custom header makes the browser preflight the reset, which only the back's allowed origins pass.
      const response = await fetch(`${apiUrl}/__debug/reset`, {
        method: "POST",
        headers: { [DEBUG_REQUEST_HEADER]: "1" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) setNotice(`The API answered ${response.status}`);
      else setNotice(live ? "Rate limits cleared" : "Rate limits and in-memory data cleared");
    } catch {
      setNotice("The API could not be reached");
    }
  }

  const injected = injectedAxes(scenario, live);

  return (
    <div className="mt-3 border-t border-bruma pt-3">
      <p className="font-semibold">Scenario for the next scan</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(DEBUG_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => apply(DebugScenario.parse(preset.scenario))}
            className={SECONDARY}
          >
            {preset.label}
          </button>
        ))}
        <button type="button" onClick={() => apply(DEFAULTS)} className={SECONDARY}>
          Clear
        </button>
      </div>
      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {AXES.filter(axis => !(live && axis.key === "latency")).map(axis => (
          <div key={axis.key} className="flex items-center justify-between gap-2">
            <label htmlFor={`${id}-${axis.key}`}>{axis.label}</label>
            <select
              id={`${id}-${axis.key}`}
              value={valueOf(scenario, axis.key)}
              onChange={event => apply(withValue(scenario, axis.key, event.target.value, live))}
              className="min-w-0 rounded-lg border border-bruma bg-white px-2 py-1 text-marino"
            >
              {axis.options.map(option => (
                <option key={option} value={option}>
                  {live && option === "default" ? "real" : option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {!live && (
        <p className="mt-2">Latency only delays the default website fixture. Injected faults answer at once.</p>
      )}
      <p className="mt-2">
        {injected.length ? `Next scan injects: ${injected.join(" · ")}` : "Next scan: no scenario injected"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!live && (
          <button type="button" onClick={fillMockFirm} className={PRIMARY}>
            Fill mock firm
          </button>
        )}
        <button type="button" onClick={() => void resetLimits()} className={PRIMARY}>
          Reset limits
        </button>
      </div>
      {notice && <p className="mt-2">{notice}</p>}
    </div>
  );
}
