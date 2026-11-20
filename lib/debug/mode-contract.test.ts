import { describe, expect, it } from "vitest";

import { DebugModeResponse } from "./mode-contract";

// DN-13 §7.6, T19: the shape of GET /__debug/mode in @arca/contracts 0.5.0, mirrored here until that release.
const BACK: DebugModeResponse = {
  mode: "live-debug",
  sourceMode: "live",
  storageBackend: "supabase",
  websiteEvidenceProvider: "agentic",
  assessmentPlanner: "rules",
  signalLlmModel: "gpt-5.4-mini",
  inUse: { openai: true, apify: true, supabase: true },
  webapp: "real",
  billing: "test",
};

describe("DebugModeResponse (contracts 0.5.0, mirrored)", () => {
  it("reads which webapp the back built and what bills it", () => {
    expect(DebugModeResponse.safeParse(BACK)).toEqual({ success: true, data: BACK });
    const simulated = { ...BACK, webapp: "simulated", billing: "simulated" };
    expect(DebugModeResponse.safeParse(simulated)).toEqual({ success: true, data: simulated });
  });

  it("calls a back without the two fields another shape, as the 0.4.0 contract would call a newer one", () => {
    const { webapp: _webapp, billing: _billing, ...older } = BACK;
    expect(DebugModeResponse.safeParse(older).success).toBe(false);
    const { billing: _onlyBilling, ...noBilling } = BACK;
    expect(DebugModeResponse.safeParse(noBilling).success).toBe(false);
  });

  it("knows only the words the back can say: never live billing, a key prefix or an unknown webapp", () => {
    for (const billing of ["live", "stripe", "rk_test_", "sk_test_", "", null]) {
      expect(DebugModeResponse.safeParse({ ...BACK, billing }).success, String(billing)).toBe(false);
    }
    for (const webapp of ["none", "supabase", "", null]) {
      expect(DebugModeResponse.safeParse({ ...BACK, webapp }).success, String(webapp)).toBe(false);
    }
  });

  it("keeps the rest of the contract strict", () => {
    expect(DebugModeResponse.safeParse({ ...BACK, extra: 1 }).success).toBe(false);
    expect(DebugModeResponse.safeParse({ ...BACK, mode: "production" }).success).toBe(false);
    expect(DebugModeResponse.safeParse({ ...BACK, inUse: { ...BACK.inUse, stripe: true } }).success).toBe(false);
    for (const value of [null, "mode", [], 1]) expect(DebugModeResponse.safeParse(value).success).toBe(false);
  });
});
