// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QuotePage from "@/app/quote/page";
import ScorePage from "@/app/score/page";
import { ApiError, pollScan, startAssessment, startScan } from "@/lib/api/client";
import { fixtureResult } from "@/lib/api/fixture";
import { rememberSession } from "@/lib/api/session";
import { installDebugStore, type DebugStore } from "./store";

// What the two pages that hold secrets publish (DN-09 §6.3, §7): /quote has the session token in hand, and the
// Layer 1 result /score reads carries the email. Neither may reach the panel.
const navigation = vi.hoisted(() => ({ router: { push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams("scan=sc_fixture"),
}));
vi.mock("@/lib/api/client", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  startScan: vi.fn(),
  pollScan: vi.fn(),
  startAssessment: vi.fn(),
}));

let store: DebugStore;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
  store = installDebugStore();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  delete window.__arcaDebug;
  delete window.__arcaDebugPending;
  vi.resetAllMocks();
  vi.unstubAllEnvs();
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

    await waitFor(() => expect(store.getSnapshot().quote).toEqual({ lastError: null, response: { status: "RUNNING", cached: false } }));
  });

  it("/quote publishes the error code and Retry-After of a refused start", async () => {
    vi.mocked(startScan).mockRejectedValue(new ApiError("rate_limited", "Scan request limit exceeded", 120));

    await submitQuote();

    await waitFor(() => expect(store.getSnapshot().quote).toEqual({ lastError: { code: "rate_limited", retryAfter: 120 }, response: null }));
  });

  it("/score publishes the scan's outcome from the raw poll, without the email the result carries", async () => {
    rememberSession("sc_fixture", "synthetic-test-capability");
    vi.mocked(startAssessment).mockResolvedValue({ assessmentId: "as_demo", status: "READY" });
    const result = fixtureResult();
    vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status: "PARTIAL", cached: true, result });

    render(<ScorePage />);

    await waitFor(() => expect(store.getSnapshot().score).toBeDefined());
    expect(store.getSnapshot().score).toEqual({
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
});
