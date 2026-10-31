// @vitest-environment jsdom
import type { DebugModeResponse } from "@arca/contracts/debug";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishDebugState, SCENARIO_STORAGE_KEY, takeDebugScenarioHeaders } from "@/lib/debug/bridge";
import DebugRoot from "./DebugRoot";

// DebugRoot lives in the root layout and is never remounted by client-side navigation, so everything it shows has to
// keep up by itself: the back's mode (DN-09 §2, §6.2) and the scenario the next scan carries (§5.3).
const navigation = vi.hoisted(() => ({ pathname: "/quote", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const BACK: DebugModeResponse = {
  mode: "mock",
  sourceMode: "mock",
  storageBackend: "memory",
  websiteEvidenceProvider: "mock",
  assessmentPlanner: "rules",
  signalLlmModel: null,
  inUse: { openai: false, apify: false, supabase: false },
};
const MOCK = "MOCK · no real APIs · in-memory data";
const ABSENT = "MODE MISMATCH · front=mock, back unreachable or production";

// What the back answers to the next probe.
let back: "mock" | "live-debug" | 404 | "hang";
const fetcher = vi.fn<typeof fetch>(async () => {
  if (back === 404) return Response.json({ error: "not_found", message: "Not found" }, { status: 404 });
  if (back === "hang") return new Promise<Response>(() => undefined);
  return Response.json({ ...BACK, mode: back });
});
const strip = () => document.querySelector('[data-arca-debug="arca-debug-sentinel-7f3c"]')?.textContent;
let visibility: "visible" | "hidden";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
  vi.stubGlobal("fetch", fetcher);
  visibility = "visible";
  vi.spyOn(Document.prototype, "visibilityState", "get").mockImplementation(() => visibility);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  fetcher.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  sessionStorage.clear();
  delete window.__arcaDebug;
  delete window.__arcaDebugPending;
  navigation.pathname = "/quote";
  navigation.search = "";
});

describe("DebugRoot", () => {
  it("shows the mismatch when the back answers 404, and the State button opens the panel", async () => {
    back = 404;
    render(<DebugRoot />);

    expect(strip()).toBe("Checking the back's mode · front=mock");
    await waitFor(() => expect(strip()).toBe(ABSENT));
    expect(fetcher).toHaveBeenCalledWith("/__debug/mode", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.queryByRole("region", { name: "Debug state" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "State" }));

    expect(screen.getByRole("region", { name: "Debug state" })).toBeTruthy();
    expect(document.body.textContent).toContain("No debug mode: a production back, or one this front does not understand");
  });

  it("probes again on every page change, on focus and when the tab becomes visible, and shows a change at once", async () => {
    back = "mock";
    const { rerender } = render(<DebugRoot />);
    await waitFor(() => expect(strip()).toBe(MOCK));
    expect(fetcher).toHaveBeenCalledTimes(1);

    // The back was restarted in another mode while the developer moved on through the flow.
    back = 404;
    navigation.pathname = "/quote/scanning";
    navigation.search = "scan=sc_1";
    rerender(<DebugRoot />);
    await waitFor(() => expect(strip()).toBe(ABSENT));
    expect(fetcher).toHaveBeenCalledTimes(2);

    back = "mock";
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(strip()).toBe(MOCK));
    expect(fetcher).toHaveBeenCalledTimes(3);

    back = "live-debug";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(strip()).toBe("MODE MISMATCH · front=mock, back=live-debug"));
    expect(fetcher).toHaveBeenCalledTimes(4);

    // Hidden is not a reason to ask.
    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("probes every 10 seconds while the tab is visible, and not while it is hidden", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    back = "mock";
    render(<DebugRoot />);
    await waitFor(() => expect(strip()).toBe(MOCK));
    expect(fetcher).toHaveBeenCalledTimes(1);

    back = 404;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await waitFor(() => expect(strip()).toBe(ABSENT));
    expect(fetcher).toHaveBeenCalledTimes(2);

    visibility = "hidden";
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the last confirmed state while a probe is in flight", async () => {
    back = "mock";
    render(<DebugRoot />);
    await waitFor(() => expect(strip()).toBe(MOCK));

    back = "hang";
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(strip()).toBe(MOCK);
  });

  it("shows the scenario the next scan injects on the strip, and drops it once a scan has taken it", async () => {
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ bar: "apify_quota", avvo: "apify_quota" }));
    back = "mock";
    render(<DebugRoot />);

    await waitFor(() => expect(strip()).toBe(`${MOCK} · next scan injects: Bar apify_quota, Avvo apify_quota`));

    // startScan takes the scenario (one-shot) and /quote publishes what it sent.
    takeDebugScenarioHeaders();
    act(() => publishDebugState("quote", { scanId: "sc_1", lastError: null, response: null, sentScenario: null }));

    await waitFor(() => expect(strip()).toBe(MOCK));
  });

  it("shows a scenario on the strip as soon as the panel's controls arm it", async () => {
    back = "mock";
    render(<DebugRoot />);
    await waitFor(() => expect(strip()).toBe(MOCK));

    await userEvent.click(screen.getByRole("button", { name: "State" }));
    await userEvent.click(screen.getByRole("button", { name: "Every source down" }));

    expect(strip()).toBe(`${MOCK} · next scan injects: Website error, Bar error, Avvo error`);

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(strip()).toBe(MOCK);
  });
});
