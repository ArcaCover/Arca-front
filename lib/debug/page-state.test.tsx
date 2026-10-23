// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AssessmentPage from "@/app/assessment/page";
import QuotePage from "@/app/quote/page";
import ScanningPage from "@/app/quote/scanning/page";
import ScorePage from "@/app/score/page";
import { ApiError, getAssessment, pollScan, saveAnswer, startAssessment, startScan } from "@/lib/api/client";
import { fixtureResult } from "@/lib/api/fixture";
import { rememberSession } from "@/lib/api/session";
import { fixtureAssessment } from "@/lib/test-fixtures/assessment";
import { SCENARIO_STORAGE_KEY, takeDebugScenarioHeaders } from "./bridge";
import { installDebugStore, type DebugStore } from "./store";

// What the two pages that hold secrets publish (DN-09 §6.3, §7): /quote has the session token in hand, and the
// Layer 1 result /score reads carries the email. Neither may reach the panel. Every payload names its scan, so the
// panel never shows one scan's state under another scan's id.
const navigation = vi.hoisted(() => ({ query: "scan=sc_fixture", router: { push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/api/client", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  startScan: vi.fn(),
  pollScan: vi.fn(),
  startAssessment: vi.fn(),
  getAssessment: vi.fn(),
  saveAnswer: vi.fn(),
}));

let store: DebugStore;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
  // Clears what the bridge remembers having sent: these tests replace startScan, which is what normally takes it.
  takeDebugScenarioHeaders();
  store = installDebugStore();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  delete window.__arcaDebug;
  delete window.__arcaDebugPending;
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  navigation.query = "scan=sc_fixture";
});

async function submitQuote() {
  render(<QuotePage />);
  await userEvent.type(screen.getByLabelText("Work email"), "partner@firm.example");
  await userEvent.type(screen.getByLabelText("Firm website"), "firm.example");
  await userEvent.click(screen.getByRole("button", { name: /Scan my firm/ }));
}

describe("state the pages publish", () => {
  it("/quote publishes what startScan answered, without the session token", async () => {
    vi.mocked(startScan).mockResolvedValue({ scanId: "sc_1", sessionToken: "synthetic-test-capability", status: "RUNNING" });

    await submitQuote();

    await waitFor(() => expect(store.getSnapshot().quote).toEqual({
      scanId: "sc_1", lastError: null, response: { status: "RUNNING", cached: false }, sentScenario: null,
    }));
  });

  it("/quote publishes the scenario the scan actually carried, which is then gone from the tab", async () => {
    const scenario = { http: { poll: "unauthorized" } };
    sessionStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
    vi.mocked(startScan).mockImplementation(async () => {
      takeDebugScenarioHeaders();
      return { scanId: "sc_2", sessionToken: "synthetic-test-capability", status: "RUNNING" };
    });

    await submitQuote();

    await waitFor(() => expect(store.getSnapshot().quote).toEqual({
      scanId: "sc_2", lastError: null, response: { status: "RUNNING", cached: false }, sentScenario: scenario,
    }));
    expect(sessionStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
  });

  it("/quote publishes the error code and Retry-After of a refused start", async () => {
    vi.mocked(startScan).mockRejectedValue(new ApiError("rate_limited", "Scan request limit exceeded", 120));

    await submitQuote();

    await waitFor(() => expect(store.getSnapshot().quote).toEqual({
      scanId: null, lastError: { code: "rate_limited", retryAfter: 120 }, response: null, sentScenario: null,
    }));
  });

  it("/score publishes the scan's outcome from the raw poll, without the email the result carries", async () => {
    rememberSession("sc_fixture", "synthetic-test-capability");
    vi.mocked(startAssessment).mockResolvedValue({ assessmentId: "as_demo", status: "READY" });
    const result = fixtureResult();
    vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status: "PARTIAL", cached: true, result });

    render(<ScorePage />);

    await waitFor(() => expect(store.getSnapshot().score).toBeDefined());
    expect(store.getSnapshot().score).toEqual({
      scanId: "sc_fixture",
      status: "PARTIAL",
      cached: true,
      meta: result.meta,
      sources: result.sources,
      preScore: {
        total: result.preScore.total,
        tier: result.preScore.tier,
        decision: result.preScore.decision,
        confidence: result.preScore.confidence,
        assessmentStatus: result.preScore.assessmentStatus,
        flags: result.preScore.flags,
      },
      identity: { status: result.identity?.status ?? null },
    });
    expect(JSON.stringify(store.getSnapshot())).not.toContain(result.email);
  });

  it("/score publishes a FAILED scan", async () => {
    rememberSession("sc_fixture", "synthetic-test-capability");
    vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status: "FAILED", cached: false });

    render(<ScorePage />);

    await waitFor(() => expect(store.getSnapshot().score).toEqual({ scanId: "sc_fixture", status: "FAILED", cached: false }));
  });

  it.each([
    ["an error it shows", new ApiError("internal_error", "Unexpected server error"), "error: internal_error", false],
    ["a refused session, before it sends the user back to /quote", new ApiError("unauthorized", "Invalid session token"),
      "error: unauthorized", true],
  ])("/score publishes %s", async (_name, error, status, redirects) => {
    rememberSession("sc_fixture", "synthetic-test-capability");
    vi.mocked(pollScan).mockRejectedValue(error);

    render(<ScorePage />);

    await waitFor(() => expect(store.getSnapshot().score).toEqual({ scanId: "sc_fixture", status, cached: null }));
    if (redirects) expect(navigation.router.replace).toHaveBeenCalledWith("/quote");
  });

  it("/quote/scanning publishes a refused session before it sends the user back to /quote", async () => {
    rememberSession("sc_fixture", "synthetic-test-capability");
    vi.mocked(pollScan).mockRejectedValue(new ApiError("unauthorized", "Invalid session token"));
    // jsdom has no matchMedia; reduced motion keeps the page from starting its orb animation.
    window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia;

    render(<ScanningPage />);

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/quote"));
    expect(store.getSnapshot().scanning).toMatchObject({
      scanId: "sc_fixture", status: "error: unauthorized", pollEveryMs: null, phase: "redirected",
    });
  });

  it("/assessment publishes after each saved answer, and no planning time for an assessment it never saw planning", async () => {
    navigation.query = "scan=sc_fixture&a=as_demo";
    rememberSession("sc_fixture", "synthetic-test-capability");
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    vi.mocked(getAssessment).mockResolvedValue(fixtureAssessment({ scanId: "sc_fixture", expiresAt }));
    vi.mocked(saveAnswer).mockResolvedValue(fixtureAssessment({
      scanId: "sc_fixture", expiresAt, status: "IN_PROGRESS",
      answers: { "governance.policy": { kind: "option", optionId: "yes" } }, progress: { answered: 1, total: 1 },
    }));

    render(<AssessmentPage />);

    await waitFor(() => expect(store.getSnapshot().assessment).toMatchObject({
      scanId: "sc_fixture", assessmentId: "as_demo", status: "READY", progress: { answered: 0, total: 1 }, planningMs: null,
    }));

    await userEvent.click(await screen.findByRole("radio", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(store.getSnapshot().assessment).toMatchObject({
      scanId: "sc_fixture", assessmentId: "as_demo", status: "IN_PROGRESS", progress: { answered: 1, total: 1 }, planningMs: null,
    }));
  });

  it("/assessment reports the time spent in PLANNING once it saw the planner at work", async () => {
    navigation.query = "scan=sc_fixture&a=as_demo";
    rememberSession("sc_fixture", "synthetic-test-capability");
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    vi.mocked(getAssessment)
      .mockResolvedValueOnce(fixtureAssessment({ scanId: "sc_fixture", expiresAt, status: "PLANNING" }))
      .mockResolvedValue(fixtureAssessment({ scanId: "sc_fixture", expiresAt }));

    render(<AssessmentPage />);

    await waitFor(() => expect(store.getSnapshot().assessment).toMatchObject({ status: "READY" }), { timeout: 4000 });
    expect(store.getSnapshot().assessment?.planningMs).toEqual(expect.any(Number));
  });
});
