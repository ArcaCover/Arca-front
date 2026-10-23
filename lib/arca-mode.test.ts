import { describe, expect, it } from "vitest";

import { resolveArcaMode } from "./arca-mode";

describe("resolveArcaMode", () => {
  it("defaults to production when the variable is missing or empty", () => {
    expect(resolveArcaMode({})).toBe("production");
    expect(resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "" })).toBe("production");
  });

  it("accepts a valid mode as written", () => {
    expect(resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "mock" })).toBe("mock");
  });

  it("refuses an unknown value and lists the valid ones", () => {
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "Mock" })).toThrow(/production, live-debug, mock/);
  });

  it("refuses a debug mode on Vercel, which only builds production", () => {
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "mock", VERCEL: "1" })).toThrow(/local-only/);
    expect(resolveArcaMode({ VERCEL: "1" })).toBe("production");
  });
});
