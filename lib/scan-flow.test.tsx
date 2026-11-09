// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from "react";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ScanningPage from "@/app/quote/scanning/page";
import ScorePage from "@/app/score/page";
import { ApiError, downloadReport, pollScan, startAssessment } from "@/lib/api/client";
import { saveFile } from "@/lib/api/download";
import { fixtureResult } from "@/lib/api/fixture";
import { recallSession, rememberSession } from "@/lib/api/session";

// What a visitor reads on the two screens around the Layer 1 result: the evidence notice and the report button on
// /score, and what /quote/scanning says when a scan fails.
const navigation = vi.hoisted(() => ({ query: "scan=sc_fixture", router: { push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/api/client", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  pollScan: vi.fn(),
  startAssessment: vi.fn(),
  downloadReport: vi.fn(),
}));
vi.mock("@/lib/api/download", () => ({ saveFile: vi.fn() }));

const TOKEN = "synthetic-test-capability";
const base = fixtureResult();
type Sources = typeof base.sources;

const skipped = { status: "skipped", dataStatus: "UNKNOWN", durationMs: 0, code: "INSUFFICIENT_IDENTITY" };
const down = { status: "error", dataStatus: "UNKNOWN", durationMs: 40, code: "PROVIDER_ERROR" };
const insufficient = {
  ...base.preScore, decision: "UNKNOWN", confidence: "LOW", assessmentStatus: "INSUFFICIENT_EVIDENCE",
  flags: ["INCOMPLETE_EVIDENCE", "COMMERCIAL_DECISION_BLOCKED"],
};

function withSources(sources: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return fixtureResult({ sources: { ...base.sources, ...sources } as Sources, ...overrides });
}

// The result the API stores for a firm whose website it could not read for a definitive reason: nothing verified,
// directories never searched, and the flag that names the case.
function unreadableWebsite() {
  const unknown = (max: number, rules: string[]) => ({
    score: null, max, status: "UNKNOWN",
    rules: rules.map(id => ({ id, points: null, reason: "Evidence unavailable or ambiguous" })),
  });
  return fixtureResult({
    domain: "blocked.arca.example",
    preScore: {
      total: 0,
      categories: {
        aiGovernance: unknown(35, ["W1", "W2", "W3", "W4"]),
        professionalStanding: unknown(30, ["B1", "B2_clean", "B3", "B4"]),
        reputation: unknown(20, ["A1", "A3", "A6"]),
        firmMaturity: unknown(15, ["W7", "W6", "W5a", "W8", "W9_A2"]),
      },
      tier: "CRITICAL",
      decision: "REFERRAL_SENIOR",
      confidence: "LOW",
      overrides: [{ id: "WEBSITE_UNAVAILABLE", decision: "REFERRAL_SENIOR", reason: "The firm website could not be read" }],
      flags: ["INCOMPLETE_SOURCES", "INCOMPLETE_EVIDENCE", "COMMERCIAL_DECISION_BLOCKED", "WEBSITE_UNAVAILABLE"],
      assessmentStatus: "INSUFFICIENT_EVIDENCE",
    },
    identity: null,
    // Nobody read the site and no directory was searched, so no signal was observed at all.
    signals: {
      website: {
        W1_aiPolicy: { found: null, depth: null, points: null },
        W2_aiInServices: { found: null, tools: null, points: null },
        W3_aiDisclosure: { found: null, points: null },
        W4_aiBlog: { found: null, count: null, points: null },
        W5_teamSize: null, W5a_teamPageQuality: null,
        W6_privacyPolicy: { found: null, mentionsClientData: null, points: null },
        W7_websiteQuality: null, W8_firmEstablished: null, W9_practiceAreas: null,
      },
      bar: { B1_allActive: null, B2_worstDisciplinary: null, B3_consistency: null, B4_avgExperience: null, attorneys: null },
      avvo: {
        A1_avgRating: null, A1_ratingLevel: null, A2_practiceAreas: null, A3_avgReviewRating: null, A3_totalReviews: null,
        A6_hasAwards: null, A6_awardsCount: null, A6_topAward: null, A8_disciplined: null,
      },
    },
    multipliers: {
      practiceArea: { area: null, value: 1, known: false },
      jurisdiction: { state: null, value: 1, known: false },
      size: { teamSize: null, value: 1, known: false },
    },
    sources: {
      website: { status: "error", dataStatus: "UNKNOWN", durationMs: 900, code: "ACCESS_BLOCKED", reason: "robots.txt does not allow automated reading" },
      bar: skipped,
      avvo: skipped,
    },
  });
}

async function showScore(result = base, status: "COMPLETED" | "PARTIAL" = "COMPLETED") {
  vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status, cached: false, result });
  render(<ScorePage />);
  return screen.findByRole("note");
}

const downloadButton = () => screen.getByRole<HTMLButtonElement>("button", { name: "Download report (PDF)" });
const comesBefore = (first: Element, second: Element) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  rememberSession("sc_fixture", TOKEN);
  vi.mocked(startAssessment).mockResolvedValue({ assessmentId: "as_demo", status: "READY" });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  sessionStorage.clear();
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.resetAllMocks();
});

describe("/score report download", () => {
  it("offers the PDF as a labelled button in the top result section, ahead of everything below it", async () => {
    await showScore();

    const top = screen.getByRole("heading", { level: 1, name: "Smith Law" }).closest("section");
    expect(top).not.toBeNull();
    expect(within(top!).getByRole("button", { name: "Download report (PDF)" })).toBeTruthy();
    expect(comesBefore(downloadButton(), screen.getByRole("heading", { name: "Score breakdown" }))).toBe(true);
    expect(comesBefore(downloadButton(), screen.getByRole("button", { name: "Refine your score" }))).toBe(true);
    // Gold is for the one primary action; the report is a secondary, outlined control.
    expect(downloadButton().className).not.toContain("bg-oro");
    expect(screen.queryByText("Download Quick Scan Report")).toBeNull();
  });

  it("downloads the report with the scan token and hands the file to the browser", async () => {
    const file = { blob: new Blob(["%PDF"]), filename: "arca-quick-scan-smithlaw.com-2026-09-11.pdf" };
    let finish!: (value: typeof file) => void;
    vi.mocked(downloadReport).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await showScore();

    await userEvent.click(downloadButton());

    expect(downloadReport).toHaveBeenCalledExactlyOnceWith("sc_fixture", TOKEN);
    const busy = screen.getByRole<HTMLButtonElement>("button", { name: "Preparing your report…" });
    expect(busy.disabled).toBe(true);
    await act(async () => finish(file));
    expect(saveFile).toHaveBeenCalledExactlyOnceWith(file);
    expect(downloadButton().disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says so next to the button when the report cannot be prepared", async () => {
    vi.mocked(downloadReport).mockRejectedValue(new ApiError("report_unavailable", "The report is unavailable"));
    await showScore();

    await userEvent.click(downloadButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("We could not prepare your report. Please try again.");
    expect(downloadButton().parentElement?.contains(alert)).toBe(true);
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("sends a visitor whose session was refused back to /quote", async () => {
    vi.mocked(downloadReport).mockRejectedValue(new ApiError("unauthorized", "Invalid session token"));
    await showScore();

    await userEvent.click(downloadButton());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/quote"));
    expect(recallSession("sc_fixture")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("/score evidence notice", () => {
  it("says every source answered, and nothing about a decision, on a fully read firm", async () => {
    const notice = await showScore();

    expect(notice.textContent).toBe("All three public sources answered: your website, the Florida Bar register and Avvo.");
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByText("Confidence: high")).toBeTruthy();
  });

  it("still says the evidence is not enough for a decision when every source answered", async () => {
    const notice = await showScore(fixtureResult({ preScore: insufficient }));

    expect(notice.textContent).toBe(
      "All three public sources answered: your website, the Florida Bar register and Avvo. "
      + "What they show is not enough for a coverage decision on its own.",
    );
  });

  it.each([
    ["a directory that was never searched", { avvo: skipped },
      "We could not look your firm up on Avvo. This score rests on less evidence than usual."],
    ["directories that did not answer", { bar: down, avvo: { ...down, status: "timeout", code: "DEADLINE_REACHED" } },
      "The Florida Bar register and Avvo did not answer. This score rests on less evidence than usual."],
    ["a website read in part and directories read in part or skipped",
      { website: { ...base.sources.website, status: "partial", code: "DEADLINE_REACHED" },
        bar: { ...base.sources.bar, status: "partial", code: "TRUNCATED" }, avvo: skipped },
      "We could only read part of your website. The Florida Bar register answered only in part. "
      + "We could not look your firm up on Avvo. This score rests on less evidence than usual."],
  ])("names in plain words %s", async (_name, sources, text) => {
    const notice = await showScore(withSources(sources), "PARTIAL");

    expect(notice.textContent).toBe(text);
    expect(screen.getAllByRole("note")).toHaveLength(1);
  });

  it("adds that the evidence is not enough for a decision when a source is missing and the engine withheld one", async () => {
    const notice = await showScore(withSources({ avvo: skipped }, { preScore: insufficient }), "PARTIAL");

    expect(notice.textContent).toBe(
      "We could not look your firm up on Avvo. This score rests on less evidence than usual. "
      + "It is not enough for a coverage decision on its own.",
    );
  });

  it("falls back to a general line for a partial scan whose sources all report as read", async () => {
    const notice = await showScore(base, "PARTIAL");

    expect(notice.textContent).toBe("Part of the public evidence could not be read, so this score rests on less evidence than usual.");
  });

  it("explains an unreadable website and puts the assessment first", async () => {
    const notice = await showScore(unreadableWebsite(), "PARTIAL");

    expect(notice.textContent).toBe(
      "We could not read your firm's website, so everything we could not verify counts as unknown. "
      + "That places your firm in the highest-risk group until you complete the assessment below. "
      + "This is not a coverage decision.",
    );
    expect(screen.getAllByRole("note")).toHaveLength(1);
    // The domain stands in for the firm name nobody could read.
    expect(screen.getByRole("heading", { level: 1, name: "blocked.arca.example" })).toBeTruthy();
    const refine = screen.getByRole("button", { name: "Refine your score" });
    expect(comesBefore(refine, screen.getByRole("heading", { name: "Score breakdown" }))).toBe(true);
    expect(comesBefore(downloadButton(), refine)).toBe(true);
    expect(screen.getAllByText("no evidence")).toHaveLength(4);
    expect(screen.queryByText("partial evidence")).toBeNull();
    // Nothing about the firm is shown that nobody read.
    expect(screen.queryByText(/lawyers?$/)).toBeNull();
    expect(screen.getByText("The scan could not confirm any individual signal for this firm.")).toBeTruthy();
  });

  it("does not claim the highest-risk group when the API scored the firm elsewhere", async () => {
    const result = unreadableWebsite();
    const notice = await showScore(
      fixtureResult({ ...result, preScore: { ...result.preScore, total: null, tier: "UNKNOWN" } }), "PARTIAL");

    expect(notice.textContent).toBe(
      "We could not read your firm's website, so everything we could not verify counts as unknown. "
      + "Complete the assessment below so your own answers count. This is not a coverage decision.",
    );
  });

  it("treats a website that failed without the flag the same way", async () => {
    const notice = await showScore(withSources({ website: { ...down, code: "NO_READABLE_EVIDENCE" }, bar: skipped, avvo: skipped }), "PARTIAL");

    expect(notice.textContent).toContain("We could not read your firm's website");
    expect(notice.textContent).not.toContain("look your firm up");
  });

  it("keeps the assessment at the end of the page when the website was read", async () => {
    await showScore();

    expect(comesBefore(screen.getByRole("heading", { name: "Signals detected" }), screen.getByRole("button", { name: "Refine your score" }))).toBe(true);
  });

  it.each([
    ["an unreadable website", unreadableWebsite],
    ["missing directories", () => withSources({ bar: down, avvo: skipped }, { preScore: { ...insufficient, flags: ["INCOMPLETE_SOURCES", "PROVIDER_COST_UNKNOWN"] } })],
  ])("never prints a machine flag or an internal code for %s", async (_name, result) => {
    await showScore(result(), "PARTIAL");

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/[A-Z]{2,}_[A-Z]/);
    expect(text).not.toMatch(/website unavailable|incomplete sources|access blocked|provider cost|robots/i);
    expect(text).not.toMatch(/\$|premium|price/i);
  });
});

describe("/quote/scanning", () => {
  beforeEach(() => {
    // jsdom has no matchMedia; reduced motion keeps the page from starting its orb animation.
    window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia;
  });

  it("tells the visitor of a failed scan to try again shortly, without blaming their site", async () => {
    vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status: "FAILED", cached: false });

    render(<ScanningPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Something went wrong on our side, or a source we rely on was temporarily unavailable. Please try again shortly.",
    );
    expect(document.body.textContent).not.toMatch(/could not read enough|blocked us|different address/);
    expect(screen.getByRole("button", { name: "Try another scan" })).toBeTruthy();
    expect(recallSession("sc_fixture")).toBeNull();
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("asks for another try once, not twice, when the connection is lost for good", async () => {
    vi.useFakeTimers();
    vi.mocked(pollScan).mockRejectedValue(
      new ApiError("network", "We could not reach the scan service. Check your connection and try again."));

    render(<ScanningPage />);
    // One failed poll is a blip: the page keeps polling.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.queryByRole("alert")).toBeNull();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(screen.getByRole("alert").textContent).toBe(
      "We lost contact with the scan service. Check your connection. Please try again shortly.",
    );
  });

  it("keeps the API's own reason when it answered with an error until the page gave up", async () => {
    vi.useFakeTimers();
    vi.mocked(pollScan).mockRejectedValue(new ApiError("internal_error", "The scan service failed."));

    render(<ScanningPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    vi.setSystemTime(Date.now() + 11 * 60_000);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(screen.getByRole("alert").textContent).toBe("The scan service failed. Please try again shortly.");
  });

  it.each(["PARTIAL", "COMPLETED"] as const)("sends a %s scan on to /score", async status => {
    const result = status === "PARTIAL" ? unreadableWebsite() : base;
    vi.mocked(pollScan).mockResolvedValue({ scanId: "sc_fixture", status, cached: false, result });

    render(<ScanningPage />);

    expect(await screen.findByText("Your results are ready.")).toBeTruthy();
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/score?scan=sc_fixture"), { timeout: 3000 });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(recallSession("sc_fixture")).toBe(TOKEN);
  });
});
