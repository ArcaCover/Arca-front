import { afterEach, describe, expect, it, vi } from "vitest";

import { completedOn, versionLine } from "./result-meta";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("completedOn", () => {
  // 02:30 UTC on Nov 10 is still the evening of Nov 9 in Florida.
  const lateEvening = "2026-11-10T02:30:00.000Z";

  it("reads the day in the visitor's time zone, not in UTC", () => {
    vi.stubEnv("TZ", "America/New_York");
    expect(completedOn(lateEvening)).toBe("Nov 9, 2026");
  });

  it("moves with the time zone", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    expect(completedOn(lateEvening)).toBe("Nov 10, 2026");
  });
});

describe("versionLine", () => {
  it("prints the version numbers the back sends today, without the word demo", () => {
    expect(versionLine("0.1.0-demo.1", "layer2-demo-fixed-coverage-0.1.0")).toBe("Question bank 0.1.0 · Scoring model 0.1.0");
  });

  it("drops the word from an id that has no version number", () => {
    const line = versionLine("demo-v1", "rules-demo");
    expect(line).toBe("Question bank v1 · Scoring model rules");
    expect(line).not.toMatch(/demo/i);
  });
});
