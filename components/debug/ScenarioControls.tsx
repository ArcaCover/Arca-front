"use client";

import { DEBUG_PRESETS, DebugScenario, isInjected } from "@arca/contracts/debug";
import { useId, useState } from "react";

import { SCENARIO_STORAGE_KEY } from "@/lib/debug/bridge";

// The faults for the next POST /scan (DN-09 §5.3, §6.4). The scenario lives in this tab's sessionStorage and the
// bridge sends it with the scan. Presets only fill the axes: the scan's outcome still comes out of the real pipeline.
const SHAPE = DebugScenario.shape;
const HTTP = SHAPE.http.removeDefault().shape;
const DEFAULTS = DebugScenario.parse({});

type AxisKey = "website" | "bar" | "avvo" | "latency" | "http.start" | "http.poll" | "http.report" | "planner";

const AXES: { key: AxisKey; label: string; options: readonly string[] }[] = [
  { key: "website", label: "Website", options: SHAPE.website.removeDefault().options },
  { key: "bar", label: "Bar", options: SHAPE.bar.removeDefault().options },
  { key: "avvo", label: "Avvo", options: SHAPE.avvo.removeDefault().options },
  { key: "latency", label: "Latency", options: SHAPE.latency.removeDefault().options },
  { key: "http.start", label: "Scan start", options: HTTP.start.removeDefault().options },
  { key: "http.poll", label: "Polls", options: HTTP.poll.removeDefault().options },
  { key: "http.report", label: "Report PDF", options: HTTP.report.removeDefault().options },
  { key: "planner", label: "Planner", options: SHAPE.planner.removeDefault().options },
];

function valueOf(scenario: DebugScenario, key: AxisKey): string {
  const [group, field] = key.split(".");
  const values: Record<string, unknown> = field ? scenario.http : scenario;
  return String(values[field ?? group]);
}

function withValue(scenario: DebugScenario, key: AxisKey, value: string): DebugScenario {
  const [group, field] = key.split(".");
  const next = field ? { ...scenario, http: { ...scenario.http, [field]: value } } : { ...scenario, [group]: value };
  return DebugScenario.parse(next);
}

// Only a scenario that injects something is kept, so the real behaviour sends no header at all.
function save(scenario: DebugScenario): void {
  try {
    if (isInjected(scenario)) sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
    else sessionStorage.removeItem(SCENARIO_STORAGE_KEY);
  } catch {
    // Blocked storage: the bridge cannot read it either, so no scenario travels.
  }
}

function readStored(): DebugScenario {
  try {
    const raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (raw === null) return DEFAULTS;
    const parsed = DebugScenario.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Blocked storage or a value that is not JSON: treated as unreadable, below.
  }
  // The back answers 400 to a scenario it cannot read, so one this build cannot read is dropped rather than sent.
  save(DEFAULTS);
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

export default function ScenarioControls({ apiUrl }: { apiUrl: string }) {
  // In live-debug the default branch of each axis is the real source, and latency does not apply.
  const live = process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug";
  const id = useId();
  // Read once, on mount: the panel only ever renders in the browser (DebugMount loads it with ssr: false).
  const [scenario, setScenario] = useState(readStored);
  const [notice, setNotice] = useState<string | null>(null);

  function apply(next: DebugScenario) {
    save(next);
    setScenario(next);
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
      const response = await fetch(`${apiUrl}/__debug/reset`, { method: "POST", signal: AbortSignal.timeout(5000) });
      if (!response.ok) setNotice(`The API answered ${response.status}`);
      else setNotice(live ? "Rate limits cleared" : "Rate limits and in-memory data cleared");
    } catch {
      setNotice("The API could not be reached");
    }
  }

  const injected = AXES.filter(axis => valueOf(scenario, axis.key) !== valueOf(DEFAULTS, axis.key));

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
              onChange={event => apply(withValue(scenario, axis.key, event.target.value))}
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
        {injected.length
          ? `Next scan injects: ${injected.map(axis => `${axis.label} ${valueOf(scenario, axis.key)}`).join(" · ")}`
          : "Next scan: no scenario injected"}
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
