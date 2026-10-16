import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { forgetAssessment, recallAssessment, rememberAssessment } from "@/lib/api/assessment-session";

const now = new Date("2026-10-13T03:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

function tabStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
  };
}

describe("assessment current-tab session", () => {
  let storage: ReturnType<typeof tabStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    storage = tabStorage();
    vi.stubGlobal("sessionStorage", storage);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("remembers only the assessment ID and expiry, separately for each scan", () => {
    rememberAssessment("sc_one", "as_one");
    rememberAssessment("sc_two", "as_two");
    expect(recallAssessment("sc_one")).toBe("as_one");
    expect(recallAssessment("sc_two")).toBe("as_two");
    expect(recallAssessment("unknown")).toBeNull();
    expect(JSON.parse(storage.getItem("arca.assessment.sc_one")!)).toEqual({ assessmentId: "as_one", expiresAt: now.getTime() + day });
  });

  it("expires at the 24-hour boundary", () => {
    rememberAssessment("sc_one", "as_one");
    vi.setSystemTime(now.getTime() + day - 1);
    expect(recallAssessment("sc_one")).toBe("as_one");
    vi.setSystemTime(now.getTime() + day);
    expect(recallAssessment("sc_one")).toBeNull();
  });

  it("honors an earlier server expiry and caps a later one at 24 hours", () => {
    const hour = 60 * 60 * 1000;
    rememberAssessment("sc_early", "as_early", new Date(now.getTime() + hour).toISOString());
    rememberAssessment("sc_late", "as_late", new Date(now.getTime() + 2 * day).toISOString());
    vi.setSystemTime(now.getTime() + hour);
    expect(recallAssessment("sc_early")).toBeNull();
    expect(recallAssessment("sc_late")).toBe("as_late");
    vi.setSystemTime(now.getTime() + day);
    expect(recallAssessment("sc_late")).toBeNull();
  });

  it("does not extend expiry when remembering a resumed assessment", () => {
    rememberAssessment("sc_one", "as_one");
    vi.setSystemTime(now.getTime() + day / 2);
    rememberAssessment("sc_one", "as_one");
    vi.setSystemTime(now.getTime() + day);
    expect(recallAssessment("sc_one")).toBeNull();
  });

  it("does not restore the assessment from localStorage in a fresh tab", () => {
    const persistentStorage = tabStorage();
    persistentStorage.setItem("arca.assessment.sc_one", JSON.stringify({ assessmentId: "as_one", expiresAt: now.getTime() + day }));
    vi.stubGlobal("localStorage", persistentStorage);
    rememberAssessment("sc_one", "as_one");
    vi.stubGlobal("sessionStorage", tabStorage());
    expect(recallAssessment("sc_one")).toBeNull();
    expect(persistentStorage.getItem).not.toHaveBeenCalled();
    expect(persistentStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it.each(["invalid JSON", "null", "[]", "{}", '{"assessmentId":12,"expiresAt":9999999999999}', '{"assessmentId":"as_one","expiresAt":"tomorrow"}', '{"assessmentId":"as_one","expiresAt":null}'])("ignores malformed stored state %s", value => {
    storage.setItem("arca.assessment.sc_one", value);
    expect(recallAssessment("sc_one")).toBeNull();
  });

  it.each(["not-a-date", "2026-10-12T03:00:00.000Z"])("does not recall an invalid or expired server deadline %s", expiresAt => {
    rememberAssessment("sc_one", "as_one", expiresAt);
    expect(recallAssessment("sc_one")).toBeNull();
  });

  it("forgets only the selected scan's assessment", () => {
    rememberAssessment("sc_one", "as_one");
    rememberAssessment("sc_two", "as_two");
    forgetAssessment("sc_one");
    expect(recallAssessment("sc_one")).toBeNull();
    expect(recallAssessment("sc_two")).toBe("as_two");
  });

  it("tolerates blocked browser storage for reads, writes, and removals", () => {
    const blocked = () => { throw new Error("Storage is disabled"); };
    vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => rememberAssessment("sc_one", "as_one")).not.toThrow();
    expect(recallAssessment("sc_one")).toBeNull();
    expect(() => forgetAssessment("sc_one")).not.toThrow();
  });
});
