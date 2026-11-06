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
