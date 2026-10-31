// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishDebugState, SCENARIO_STORAGE_KEY, sentDebugScenario, takeDebugScenarioHeaders } from "./bridge";
import { installDebugStore } from "./store";

const SCENARIO = JSON.stringify({ bar: "apify_quota", avvo: "apify_quota" });

describe("debug bridge", () => {
  const publish = vi.fn();

  beforeEach(() => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, SCENARIO);
    window.__arcaDebug = { publish };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    publish.mockReset();
    sessionStorage.clear();
    delete window.__arcaDebug;
  });

  it("does nothing in production, even with a scenario stored and a store installed", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");

    expect(takeDebugScenarioHeaders()).toEqual({});
    publishDebugState("quote", { status: "RUNNING" });
    expect(publish).not.toHaveBeenCalled();
    // Production never reads, removes or reports the stored scenario.
    expect(sessionStorage.getItem(SCENARIO_STORAGE_KEY)).toBe(SCENARIO);
    expect(sentDebugScenario()).toBeNull();
  });

  it("treats a missing mode as production", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);

    expect(takeDebugScenarioHeaders()).toEqual({});
    publishDebugState("quote", { status: "RUNNING" });
    expect(publish).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SCENARIO_STORAGE_KEY)).toBe(SCENARIO);
  });

  it("sends the stored scenario and publishes the page state in mock", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");

    expect(takeDebugScenarioHeaders()).toEqual({ "X-Arca-Debug-Scenario": SCENARIO });
    publishDebugState("score", { cached: false });
    expect(publish).toHaveBeenCalledWith("score", { cached: false });
  });

  // DN-09 §5.3, §6.4: the scenario rides on the next POST /scan only. Taking it removes it, so a leftover cannot keep
  // changing later scans without anyone seeing it.
  it("is one-shot: the scenario travels with the next scan only, and the bridge says what it sent", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");

    expect(takeDebugScenarioHeaders()).toEqual({ "X-Arca-Debug-Scenario": SCENARIO });
    expect(sessionStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(sentDebugScenario()).toEqual(JSON.parse(SCENARIO));

    expect(takeDebugScenarioHeaders()).toEqual({});
    expect(sentDebugScenario()).toBeNull();
  });

  it("sends no header in mock when no scenario was chosen", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.clear();

    expect(takeDebugScenarioHeaders()).toEqual({});
  });

  it("sends no header, and does not throw, when storage is blocked or missing (server render)", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(takeDebugScenarioHeaders()).toEqual({});
    expect(sentDebugScenario()).toBeNull();
    blocked.mockRestore();

    // A scenario that cannot be removed is not sent either: it would otherwise ride on every scan.
    const stuck = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(takeDebugScenarioHeaders()).toEqual({});
    stuck.mockRestore();

    vi.stubGlobal("sessionStorage", undefined);
    expect(takeDebugScenarioHeaders()).toEqual({});
    vi.unstubAllGlobals();
  });

  it("never lets a broken store break the page", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    publish.mockImplementation(() => {
      throw new Error("store failed");
    });

    expect(() => publishDebugState("assessment", { status: "ACTIVE" })).not.toThrow();
  });
});

describe("debug store", () => {
  // The panel is loaded lazily, so pages publish on mount before any store exists.
  beforeEach(() => {
    delete window.__arcaDebug;
    delete window.__arcaDebugPending;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__arcaDebug;
    delete window.__arcaDebugPending;
  });

  it("keeps the last state each page published before the store installed, and the store starts from it", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    publishDebugState("quote", { status: "RUNNING" });
    publishDebugState("quote", { status: "COMPLETED" });
    publishDebugState("score", { cached: true });

    const store = installDebugStore();

    expect(store.getSnapshot()).toEqual({ quote: { status: "COMPLETED" }, score: { cached: true } });
    expect(window.__arcaDebugPending).toBeUndefined();
  });

  it("keeps nothing in production", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
    publishDebugState("quote", { status: "RUNNING" });

    expect(window.__arcaDebugPending).toBeUndefined();
  });

  it("reuses the installed store, so a remount keeps its state and its subscribers", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    const first = installDebugStore();
    const listener = vi.fn();
    first.subscribe(listener);
    publishDebugState("assessment", { status: "ACTIVE" });

    const second = installDebugStore();
    publishDebugState("assessment", { status: "COMPLETED" });

    expect(second).toBe(first);
    expect(window.__arcaDebug).toBe(first);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(second.getSnapshot()).toEqual({ assessment: { status: "COMPLETED" } });
  });

  it("reaches the installed store, which hands useSyncExternalStore a new snapshot per publish", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    const store = installDebugStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();

    expect(store.getSnapshot()).toBe(before);
    publishDebugState("results", { compositeScore: 71 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot()).toEqual({ results: { compositeScore: 71 } });

    unsubscribe();
    publishDebugState("results", { compositeScore: 72 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().results).toEqual({ compositeScore: 72 });
  });
});
