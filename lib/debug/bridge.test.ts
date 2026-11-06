// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debugPay, debugSignIn, publishDebugState, SCENARIO_STORAGE_KEY, sentDebugScenario, takeDebugScenarioHeaders } from "./bridge";
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

// DN-10 section 5: the simulated sign-in and payment. The guard is the same literal comparison as above, and it sits
// before the dynamic import, so a production build ships neither the modules nor the /__debug/ paths they call.
describe("debug sign-in and payment", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const sent = (call = 0) => {
    const [url, init] = fetchMock.mock.calls[call] ?? [];
    return { url: String(url), method: init?.method, headers: new Headers(init?.headers), body: JSON.parse(String(init?.body ?? "null")) as unknown };
  };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([undefined, "production", "live-debug"])("does nothing, and calls nothing, when the mode is %s", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);

    await expect(debugSignIn("ana@smithlaw.com")).resolves.toBeNull();
    await expect(debugSignIn("ana@smithlaw.com", true)).resolves.toBeNull();
    await expect(debugPay("cs_1")).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in through /__debug/auth/login with the debug header, and returns what the session needs", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockResolvedValueOnce(Response.json({
      token: "mock-jwt", user: { userId: "u_1", email: "ana@smithlaw.com" }, expiresAt: "2026-10-26T22:00:00.000Z",
    }));

    await expect(debugSignIn("Ana@SmithLaw.com")).resolves.toEqual({
      token: "mock-jwt", email: "ana@smithlaw.com", expiresAt: "2026-10-26T22:00:00.000Z",
    });

    expect(sent()).toMatchObject({ url: "http://api.test/__debug/auth/login", method: "POST", body: { email: "Ana@SmithLaw.com" } });
    expect(sent().headers.get("X-Arca-Debug")).toBe("1");
    expect(sent().headers.get("Content-Type")).toBe("application/json");
  });

  it("asks for a platform admin only when told to", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockImplementation(async () => Response.json({
      token: "mock-jwt", user: { userId: "u_1", email: "ana@arca.test" }, expiresAt: "2026-10-26T22:00:00.000Z",
    }));

    await debugSignIn("ana@arca.test", true);
    await debugSignIn("ana@arca.test");

    expect(sent(0).body).toEqual({ email: "ana@arca.test", platformAdmin: true });
    expect(sent(1).body).toEqual({ email: "ana@arca.test" });
  });

  it("surfaces a refused login as a typed error, and an answer it does not know as a contract error", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "invalid_request", message: "A valid email is required" }, { status: 400 }));
    await expect(debugSignIn("not an email")).rejects.toMatchObject({ name: "ApiError", code: "invalid_request" });

    fetchMock.mockResolvedValueOnce(Response.json({ token: "mock-jwt" }));
    await expect(debugSignIn("ana@smithlaw.com")).rejects.toMatchObject({ code: "contract" });
  });

  it("pays a checkout session through /__debug/billing/pay with the debug header", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));

    await expect(debugPay("cs_mock_1")).resolves.toBe(true);

    expect(sent()).toMatchObject({ url: "http://api.test/__debug/billing/pay", method: "POST", body: { sessionId: "cs_mock_1" } });
    expect(sent().headers.get("X-Arca-Debug")).toBe("1");
  });

  it("says false for a session that is unknown or already paid, and throws for anything else", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "conflict", message: "Unknown or already paid checkout session" }, { status: 409 }));
    await expect(debugPay("cs_mock_1")).resolves.toBe(false);

    fetchMock.mockResolvedValueOnce(Response.json({ error: "not_found", message: "Not found" }, { status: 404 }));
    await expect(debugPay("cs_mock_1")).rejects.toMatchObject({ code: "not_found" });
  });
});
