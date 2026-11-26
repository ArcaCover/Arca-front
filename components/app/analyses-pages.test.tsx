// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnalysisView, MeResponse, OrgView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import AnalysesPage from "@/app/app/analyses/page";
import AnalysisDetailPage from "@/app/app/analyses/[scanId]/page";
import { ApiError } from "@/lib/api/client";
import { fixtureResult } from "@/lib/api/fixture";
import { getMe, listAnalyses, listMembers } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";
import { fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";
import { thinEvidenceResult } from "@/lib/test-fixtures/layer1";

const navigation = vi.hoisted(() => ({
  pathname: "/app/analyses",
  query: "",
  params: {} as Record<string, string>,
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.query),
  useParams: () => navigation.params,
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

const future = () => new Date(Date.now() + 3_600_000).toISOString();

function org(overrides: Partial<OrgView> = {}): OrgView {
  return {
    id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
    deletionPending: false, paidAccess: true, ...overrides,
  };
}

function me(organizations: OrgView[]): MeResponse {
  return { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
}

function assessed(): AnalysisView {
  return {
    scanId: "sc_demo", domain: "smithlaw.com", scanStatus: "COMPLETED", claimedAt: "2026-10-25T10:00:00.000Z",
    layer1: fixtureResult({ scanId: "sc_demo" }), assessment: fixtureAssessmentResult(),
  };
}

function scanOnly(): AnalysisView {
  return {
    scanId: "sc_branch", domain: "branch.smithlaw.com", scanStatus: "COMPLETED", claimedAt: "2026-10-20T10:00:00.000Z",
    layer1: fixtureResult({ scanId: "sc_branch", domain: "branch.smithlaw.com" }), assessment: null,
  };
}

// A scan-only analysis of the hklaw.com shape: 3 / 100, CRITICAL, with only one category partly evaluated.
function thinScanOnly(): AnalysisView {
  return {
    scanId: "sc_thin", domain: "hklaw.example", scanStatus: "PARTIAL", claimedAt: "2026-10-22T10:00:00.000Z",
    layer1: thinEvidenceResult({ scanId: "sc_thin" }), assessment: null,
  };
}

// A firm whose website could not be read at all (DN-12 §14): the API still sends 0 and CRITICAL, with the flag.
function unreadLayer1(scanId: string) {
  const base = thinEvidenceResult({ scanId, domain: "down.arca.example" });
  return thinEvidenceResult({ scanId, domain: "down.arca.example", preScore: { ...base.preScore, total: 0, tier: "CRITICAL",
    flags: ["INCOMPLETE_SOURCES", "WEBSITE_UNAVAILABLE", "INCOMPLETE_EVIDENCE", "COMMERCIAL_DECISION_BLOCKED"] } });
}

function unreadScanOnly(): AnalysisView {
  return {
    scanId: "sc_down", domain: "down.arca.example", scanStatus: "PARTIAL", claimedAt: "2026-11-17T10:00:00.000Z",
    layer1: unreadLayer1("sc_down"), assessment: null,
  };
}

// Its assessment: Layer 1 had no evidence, so the composite is the answers alone.
function unreadAssessed(): AnalysisView {
  return {
    scanId: "sc_down_assessed", domain: "down.arca.example", scanStatus: "PARTIAL", claimedAt: "2026-11-17T11:00:00.000Z",
    layer1: unreadLayer1("sc_down_assessed"),
    assessment: fixtureAssessmentResult({ scanId: "sc_down_assessed", layer1Score: null, layer2Score: 64, compositeScore: 64,
      tier: "FORTIFIED", flags: ["COMMERCIAL_DECISION_BLOCKED", "LAYER1_UNAVAILABLE", "WEBSITE_UNAVAILABLE"] }),
  };
}

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  vi.mocked(getMe).mockResolvedValue(me(organizations));
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const table = () => screen.findByRole("table", { name: "Saved analyses" });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  navigation.query = "";
  navigation.params = {};
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(listMembers).mockResolvedValue({ members: [], invitations: [] });
});

afterEach(cleanup);

describe("the analyses list", () => {
  it("shows each analysis with its type, tier and a link to its detail", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed()]);
    inApp("/app/analyses", <AnalysesPage />);
    const rows = within(await table()).getAllByRole("row");
    const row = rows[1];
    expect(within(row).getByText("smithlaw.com")).toBeTruthy();
    expect(within(row).getByText("Scan and assessment")).toBeTruthy();
    expect(within(row).getByText("GUARDED")).toBeTruthy();
    expect(within(row).getByRole("link", { name: "View smithlaw.com" }).getAttribute("href")).toBe("/app/analyses/sc_demo");
    expect(within(row).getByRole("link", { name: "Re-run smithlaw.com" }).getAttribute("href")).toBe("/quote");
    expect(within(row).getByRole<HTMLButtonElement>("button", { name: /Download report/ }).disabled).toBe(true);
    expect(listAnalyses).toHaveBeenCalledExactlyOnceWith("org_1");
  });

  it("filters by type", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed(), scanOnly()]);
    inApp("/app/analyses", <AnalysesPage />);
    await table();
    expect(screen.getByRole("link", { name: "View smithlaw.com" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /^Scan only/ }));
    expect(screen.getByRole("button", { name: /^Scan only/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("link", { name: "View smithlaw.com" })).toBeNull();
    expect(screen.getByRole("link", { name: "View branch.smithlaw.com" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /^With assessment/ }));
    expect(screen.getByRole("link", { name: "View smithlaw.com" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "View branch.smithlaw.com" })).toBeNull();
  });

  it("compares two ticked analyses side by side", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed(), scanOnly()]);
    inApp("/app/analyses", <AnalysesPage />);
    await table();
    await userEvent.click(screen.getByRole("checkbox", { name: /^Compare smithlaw.com/ }));
    expect(screen.getByText("Tick one more analysis to compare.")).toBeTruthy();
    await userEvent.click(screen.getByRole("checkbox", { name: /^Compare branch.smithlaw.com/ }));
    expect(screen.getByRole("region", { name: /^smithlaw.com, saved/ })).toBeTruthy();
    expect(screen.getByRole("region", { name: /^branch.smithlaw.com, saved/ })).toBeTruthy();
    expect(screen.getByText(/their bars measure different things/)).toBeTruthy();
  });

  it("offers a first analysis when there is none", async () => {
    signedIn(org());
    inApp("/app/analyses", <AnalysesPage />);
    expect(await screen.findByText("No analyses saved yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Run your first analysis" }).getAttribute("href")).toBe("/quote");
  });

  it("goes to billing when the API answers 402", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    vi.mocked(listAnalyses).mockRejectedValue(new ApiError("payment_required", "This organization has no active subscription"));
    inApp("/app/analyses", <AnalysesPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/billing"));
  });
});

describe("a scan-only analysis with too little evidence to rate", () => {
  it("shows no score and no risk tier in the list or the comparison", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed(), thinScanOnly()]);
    inApp("/app/analyses", <AnalysesPage />);
    const row = within(await table()).getAllByRole("row").find(item => within(item).queryByText("hklaw.example"));
    expect(row).toBeTruthy();
    expect(within(row!).getByText("—")).toBeTruthy();
    expect(within(row!).getByText("NOT SCORED")).toBeTruthy();
    expect(within(row!).queryByText("CRITICAL")).toBeNull();

    await userEvent.click(screen.getByRole("checkbox", { name: /^Compare smithlaw.com/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /^Compare hklaw.example/ }));
    const compared = screen.getByRole("region", { name: /^hklaw.example, saved/ });
    expect(within(compared).getByText("NOT SCORED")).toBeTruthy();
    expect(within(compared).queryByText("CRITICAL")).toBeNull();
  });

  it("says on its card how many areas could be evaluated, instead of the number and the tier", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([thinScanOnly()]);
    navigation.params = { scanId: "sc_thin" };
    inApp("/app/analyses/sc_thin", <AnalysisDetailPage />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: not enough evidence to score" })).toBeTruthy();
    expect(screen.getByText("NOT SCORED")).toBeTruthy();
    expect(screen.queryByText("CRITICAL")).toBeNull();
    expect(screen.getByText("We could evaluate only 1 of 4 areas from public sources, so we are not showing a score.")).toBeTruthy();
    // One message: the sentence above replaces the card's line about a coverage decision.
    expect(screen.queryByText(/not enough evidence in this scan for a coverage decision/i)).toBeNull();
  });
});

describe("an analysis of a firm whose website could not be read", () => {
  it("shows a scan-only analysis with no score and no risk tier, and says why on its card", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([unreadScanOnly()]);
    navigation.params = { scanId: "sc_down" };
    inApp("/app/analyses/sc_down", <AnalysisDetailPage />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: not enough evidence to score" })).toBeTruthy();
    expect(screen.getByText("NOT SCORED")).toBeTruthy();
    expect(screen.queryByText("CRITICAL")).toBeNull();
    expect(screen.getByText("We could not read your firm's website, so we have no public evidence to score.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/highest-risk|manual review/);
  });

  it("lists it with no score and no tier", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([unreadScanOnly()]);
    inApp("/app/analyses", <AnalysesPage />);
    const row = within(await table()).getAllByRole("row").find(item => within(item).queryByText("down.arca.example"));
    expect(within(row!).getByText("—")).toBeTruthy();
    expect(within(row!).getByText("NOT SCORED")).toBeTruthy();
  });

  it("shows an assessed one with the answers-only score, marked as low confidence", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([unreadAssessed()]);
    navigation.params = { scanId: "sc_down_assessed" };
    inApp("/app/analyses/sc_down_assessed", <AnalysisDetailPage />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: 64 out of 100" })).toBeTruthy();
    expect(screen.getByText("FORTIFIED")).toBeTruthy();
    expect(screen.getByText("Based only on your answers; no public evidence could be verified (low confidence).")).toBeTruthy();
  });
});

describe("the analysis detail", () => {
  it("finds the analysis by its scanId and shows its gauge, signals, actions and sample history", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([scanOnly(), assessed()]);
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "All analyses" }).getAttribute("href")).toBe("/app/analyses");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Download report/ }).disabled).toBe(true);

    await userEvent.click(screen.getByRole("tab", { name: /Signals/ }));
    expect(screen.getByText("AI usage policy published on the website")).toBeTruthy();

    await userEvent.click(screen.getByRole("tab", { name: /Action plan/ }));
    expect(within(screen.getByRole("list", { name: "Recommended actions" })).getByText("Document the policy")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Action plan" })).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: /History/ }));
    expect(screen.getByText("Sample data · Illustrative")).toBeTruthy();
  });

  it("says when the scan has no assessment to take actions from", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([scanOnly()]);
    navigation.params = { scanId: "sc_branch" };
    inApp("/app/analyses/sc_branch", <AnalysisDetailPage />);
    await userEvent.click(await screen.findByRole("tab", { name: /Action plan/ }));
    expect(screen.getByText("No assessment yet")).toBeTruthy();
  });

  it("shows not found for a scanId the organization does not have", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed()]);
    navigation.params = { scanId: "sc_unknown" };
    inApp("/app/analyses/sc_unknown", <AnalysisDetailPage />);
    expect(await screen.findByText("Analysis not found")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /AI Governance Score/ })).toBeNull();
  });

  it("goes to billing when the API answers 402", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    vi.mocked(listAnalyses).mockRejectedValue(new ApiError("payment_required", "This organization has no active subscription"));
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/billing"));
  });
});
