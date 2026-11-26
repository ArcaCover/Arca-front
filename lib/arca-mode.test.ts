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
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "Mock" })).toThrow(/production, live-debug, mock, demo/);
  });

  it("refuses a debug mode on Vercel, which only builds production", () => {
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "mock", VERCEL: "1" })).toThrow(/local-only/);
    expect(resolveArcaMode({ VERCEL: "1" })).toBe("production");
  });

  it("builds the dev branch's Vercel previews in demo without any variable", () => {
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "dev" })).toBe("demo");
    // Any other branch's preview, and production, stay in production.
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/x" })).toBe("production");
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" })).toBe("production");
  });

  it("lets an explicit mode win on the dev preview", () => {
    expect(
      resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "production", VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "dev" }),
    ).toBe("production");
  });

  it("runs demo locally and on any preview, never on the production deployment", () => {
    expect(resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "demo" })).toBe("demo");
    expect(resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "demo", VERCEL: "1", VERCEL_ENV: "preview" })).toBe("demo");
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "demo", VERCEL: "1", VERCEL_ENV: "production" })).toThrow(
      /never for production/,
    );
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
