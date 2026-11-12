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
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "Mock" })).toThrow(/production, live-debug, mock, demo/);
  });

  it("refuses a debug mode on Vercel, which only builds production", () => {
    expect(() => resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "mock", VERCEL: "1" })).toThrow(/local-only/);
    expect(resolveArcaMode({ VERCEL: "1" })).toBe("production");
  });

  it("builds the Dev branch's Vercel previews in demo without any variable", () => {
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "Dev" })).toBe("demo");
    // Any other branch's preview, and production, stay in production.
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/x" })).toBe("production");
    expect(resolveArcaMode({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" })).toBe("production");
  });

  it("lets an explicit mode win on the Dev preview", () => {
    expect(
      resolveArcaMode({ NEXT_PUBLIC_ARCA_MODE: "production", VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "Dev" }),
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
