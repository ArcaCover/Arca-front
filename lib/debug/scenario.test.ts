// @vitest-environment jsdom
import { DebugScenario } from "@arca/contracts/debug";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SCENARIO_STORAGE_KEY } from "./bridge";
import { armedScenario, forMode, injectedAxes } from "./scenario";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("injectedAxes", () => {
  it("names every axis that differs from its default, with its value", () => {
    const scenario = DebugScenario.parse({ bar: "apify_quota", latency: "slow", http: { poll: "hang" } });

    expect(injectedAxes(scenario, false)).toEqual(["Bar apify_quota", "Latency slow", "Polls hang"]);
  });

  it("in live-debug leaves latency out: only mock applies it", () => {
    const scenario = DebugScenario.parse({ bar: "apify_quota", latency: "slow" });

    expect(injectedAxes(scenario, true)).toEqual(["Bar apify_quota"]);
    expect(forMode(scenario, true)).toEqual(DebugScenario.parse({ bar: "apify_quota" }));
    expect(forMode(scenario, false)).toBe(scenario);
  });
});

describe("armedScenario", () => {
  it("reads what the next scan will inject from this tab's storage", () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ website: "error", avvo: "error" }));

    expect(armedScenario(false)).toEqual(["Website error", "Avvo error"]);
  });

  it("in live-debug says nothing of a stored latency", () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ latency: "slow" }));

    expect(armedScenario(true)).toEqual([]);
    expect(armedScenario(false)).toEqual(["Latency slow"]);
  });

  it("is empty when nothing is stored or the storage is blocked", () => {
    expect(armedScenario(false)).toEqual([]);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(armedScenario(false)).toEqual([]);
  });

  // The bridge sends whatever is stored, and the back answers 400 to a value it cannot read: the strip says so.
  it("flags a stored value it cannot read, which the next scan would still carry", () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, "{not json");
    expect(armedScenario(false)).toEqual(["an unreadable scenario"]);

    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ website: "on_fire" }));
    expect(armedScenario(false)).toEqual(["an unreadable scenario"]);
  });
});
