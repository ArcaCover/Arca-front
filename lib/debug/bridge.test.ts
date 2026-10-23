// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debugScenarioHeaders, publishDebugState, SCENARIO_STORAGE_KEY } from "./bridge";
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

    expect(debugScenarioHeaders()).toEqual({});
    publishDebugState("quote", { status: "RUNNING" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("treats a missing mode as production", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);

    expect(debugScenarioHeaders()).toEqual({});
    publishDebugState("quote", { status: "RUNNING" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("sends the stored scenario and publishes the page state in mock", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");

    expect(debugScenarioHeaders()).toEqual({ "X-Arca-Debug-Scenario": SCENARIO });
    publishDebugState("score", { cached: false });
    expect(publish).toHaveBeenCalledWith("score", { cached: false });
  });

  it("sends no header in mock when no scenario was chosen", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.clear();

    expect(debugScenarioHeaders()).toEqual({});
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
