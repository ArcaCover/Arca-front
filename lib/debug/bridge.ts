// What production pages call to reach the debug tools (DN-09 §6.1). Each function opens with a literal comparison of
// the inlined mode, so in a production build its body folds to `return` and nothing after it ships.
export type DebugSection = "quote" | "scanning" | "score" | "assessment" | "results";

declare global {
  interface Window {
    // Installed by lib/debug/store.ts, which only a mock or live-debug build loads.
    __arcaDebug?: { publish(section: DebugSection, data: Record<string, unknown>): void };
  }
}

export const SCENARIO_STORAGE_KEY = "arca.debug.scenario";

export function publishDebugState(section: DebugSection, data: Record<string, unknown>): void {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "mock" && process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return;
  try {
    window.__arcaDebug?.publish(section, data);
  } catch {
    // The panel is a spectator: whatever happens to it, the page carries on.
  }
}

export function debugScenarioHeaders(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "mock" && process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return {};
  const scenario = sessionStorage.getItem(SCENARIO_STORAGE_KEY);
  return scenario ? { "X-Arca-Debug-Scenario": scenario } : {};
}
