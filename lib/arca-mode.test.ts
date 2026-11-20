import { describe, expect, it } from "vitest";

import { resolveArcaMode, resolveWebappEnabled } from "./arca-mode";

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

// DN-13 §8.2 and §8.4: whether the build runs the webapp on the real accounts. Inlined like the mode, so a typo or a
// combination the back refuses stops the build instead of shipping a webapp that cannot sign anyone in.
describe("resolveWebappEnabled", () => {
  it.each([undefined, "", "false"])("is off when the variable is %o", value => {
    expect(resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: value }, "production")).toBe(false);
  });

  it.each(["production", "live-debug"] as const)("is on with true in %s", mode => {
    expect(resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: "true" }, mode)).toBe(true);
  });

  it("refuses any other value", () => {
    expect(() => resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: "TRUE" }, "production")).toThrow(/true or false/);
    expect(() => resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: "1" }, "production")).toThrow(/true or false/);
  });

  // The back refuses mock with WEBAPP_PROVIDERS=real (DN-13 §7.1): mock never calls a real service.
  it("refuses true in mock", () => {
    expect(() => resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: "true" }, "mock")).toThrow(/mock/);
    expect(resolveWebappEnabled({ NEXT_PUBLIC_WEBAPP_ENABLED: "false" }, "mock")).toBe(false);
  });
});
