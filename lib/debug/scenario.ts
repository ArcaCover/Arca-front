import { DebugScenario } from "@arca/contracts/debug";

import { SCENARIO_STORAGE_KEY } from "./bridge";

// The scenario axes as the panel names them, shared by the scenario controls and the strip (DN-09 §5.3, §6.2).
const SHAPE = DebugScenario.shape;
const HTTP = SHAPE.http.removeDefault().shape;
export const DEFAULT_SCENARIO = DebugScenario.parse({});

export type AxisKey = "website" | "bar" | "avvo" | "latency" | "http.start" | "http.poll" | "http.report" | "planner";

export const AXES: { key: AxisKey; label: string; options: readonly string[] }[] = [
  { key: "website", label: "Website", options: SHAPE.website.removeDefault().options },
  { key: "bar", label: "Bar", options: SHAPE.bar.removeDefault().options },
  { key: "avvo", label: "Avvo", options: SHAPE.avvo.removeDefault().options },
  { key: "latency", label: "Latency", options: SHAPE.latency.removeDefault().options },
  { key: "http.start", label: "Scan start", options: HTTP.start.removeDefault().options },
  { key: "http.poll", label: "Polls", options: HTTP.poll.removeDefault().options },
  { key: "http.report", label: "Report PDF", options: HTTP.report.removeDefault().options },
  { key: "planner", label: "Planner", options: SHAPE.planner.removeDefault().options },
];

export function valueOf(scenario: DebugScenario, key: AxisKey): string {
  const [group, field] = key.split(".");
  const values: Record<string, unknown> = field ? scenario.http : scenario;
  return String(values[field ?? group]);
}

// Latency exists only in mock. In live-debug it is dropped everywhere the front handles a scenario, as the back drops it.
export function forMode(scenario: DebugScenario, live: boolean): DebugScenario {
  return live && scenario.latency !== "instant" ? { ...scenario, latency: "instant" } : scenario;
}

/** "Label value" for each axis the scenario changes, in panel order. */
export function injectedAxes(scenario: DebugScenario, live: boolean): string[] {
  const applied = forMode(scenario, live);
  return AXES.filter(axis => valueOf(applied, axis.key) !== valueOf(DEFAULT_SCENARIO, axis.key)).map(
    axis => `${axis.label} ${valueOf(applied, axis.key)}`,
  );
}

/** What the next POST /scan from this tab will inject, read from sessionStorage, as the strip shows it. */
export function armedScenario(live: boolean): string[] {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
  } catch {
    // Blocked storage: the bridge cannot read it either, so nothing travels.
    return [];
  }
  if (raw === null) return [];
  try {
    const parsed = DebugScenario.safeParse(JSON.parse(raw));
    if (parsed.success) return injectedAxes(parsed.data, live);
  } catch {
    // Not JSON: flagged below.
  }
  // The bridge sends whatever is stored, and the back answers 400 to a value it cannot read.
  return ["an unreadable scenario"];
}
