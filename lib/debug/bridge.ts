// What production pages call to reach the debug tools (DN-09 §6.1). Each function opens with a literal comparison of
// the inlined mode, so in a production build its body folds to `return` and nothing after it ships.
export type DebugSection = "quote" | "scanning" | "score" | "assessment" | "results";

declare global {
  interface Window {
    // Installed by lib/debug/store.ts, which only a mock or live-debug build loads.
    __arcaDebug?: { publish(section: DebugSection, data: Record<string, unknown>): void };
    // The panel loads lazily, after pages have published on mount: the last state per section waits here until the
    // store installs and adopts it.
    __arcaDebugPending?: Partial<Record<DebugSection, Record<string, unknown>>>;
  }
}

export const SCENARIO_STORAGE_KEY = "arca.debug.scenario";

export function publishDebugState(section: DebugSection, data: Record<string, unknown>): void {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "mock" && process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return;
  try {
    if (window.__arcaDebug) window.__arcaDebug.publish(section, data);
    else window.__arcaDebugPending = { ...window.__arcaDebugPending, [section]: data };
  } catch {
    // The panel is a spectator: whatever happens to it, the page carries on.
  }
}

// The scenario the last POST /scan carried, so /quote can publish what it actually sent.
let lastSentScenario: string | null = null;

// One-shot (DN-09 §5.3, §6.4): the scenario rides on the next POST /scan only. Taking it removes it from the tab, so a
// leftover can never keep changing later scans unseen.
export function takeDebugScenarioHeaders(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "mock" && process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return {};
  lastSentScenario = null;
  try {
    const scenario = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!scenario) return {};
    // Removed before it is sent: one that cannot be removed is not sent at all, rather than sent with every scan.
    sessionStorage.removeItem(SCENARIO_STORAGE_KEY);
    lastSentScenario = scenario;
    return { "X-Arca-Debug-Scenario": scenario };
  } catch {
    // No storage on the server, and a blocked one throws: the scan then starts without a scenario.
    return {};
  }
}

/** The scenario the last call above handed to a scan, parsed when it can be; null when it sent none. */
export function sentDebugScenario(): unknown {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "mock" && process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return null;
  if (lastSentScenario === null) return null;
  try {
    return JSON.parse(lastSentScenario);
  } catch {
    return lastSentScenario;
  }
}
