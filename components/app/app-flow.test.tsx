// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnalysisView, MeResponse, OrgView } from "@arca/contracts";

import AdminPage from "@/app/app/admin/page";
import AppLayout from "@/app/app/layout";
import AppHome from "@/app/app/page";
import BillingPage from "@/app/app/billing/page";
import MockCheckoutPage from "@/app/app/billing/mock-checkout/page";
import InvitePage from "@/app/app/invite/[token]/page";
import LoginPage from "@/app/app/login/page";
import MembersPage from "@/app/app/members/page";
import SettingsPage from "@/app/app/settings/page";
import SignupPage from "@/app/app/signup/page";
import SaveResultsCta from "@/components/app/SaveResultsCta";
import { ApiError } from "@/lib/api/client";
import { fixtureResult } from "@/lib/api/fixture";
import { rememberSession } from "@/lib/api/session";
import { signIn } from "@/lib/app/auth";
import {
  acceptInvitation, adminListDeletionRequests, adminListOrganizations, adminListPlans, adminReviewDeletion, adminUpdatePlan,
  attachAnalysis, createClaim, createOrg, getMe, getPlans, invite, listAnalyses, listMembers, portal, requestDeletion,
  setMemberRole,
} from "@/lib/app/client";
import { loadAppSession, loadPendingClaim, recallOrg, saveAppSession, savePendingClaim } from "@/lib/app/session";
import { debugPay } from "@/lib/debug/bridge";
import { fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";

const navigation = vi.hoisted(() => ({
  pathname: "/app",
  query: "",
  params: {} as Record<string, string>,
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.query),
  useParams: () => navigation.params,
  // What Next's notFound() does: it throws, and the nearest not-found boundary renders instead.
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");
vi.mock("@/lib/app/auth", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/app/auth")>(), signIn: vi.fn() }));
vi.mock("@/lib/debug/bridge", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/debug/bridge")>(), debugPay: vi.fn() }));

const NOT_AVAILABLE = "Sign-in is not available yet in this environment.";
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

function analysis(): AnalysisView {
  return {
    scanId: "sc_demo", domain: "smithlaw.com", scanStatus: "COMPLETED", claimedAt: "2026-10-25T10:00:00.000Z",
    layer1: fixtureResult({ scanId: "sc_demo" }), assessment: fixtureAssessmentResult(),
  };
}

/** A signed-in user whose /me lists these organizations. */
function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  vi.mocked(getMe).mockResolvedValue(me(organizations));
}

/** A page as Next renders it: inside the /app layout, at its own path. */
function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });
const select = (name: string) => screen.getByRole<HTMLSelectElement>("combobox", { name });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  navigation.query = "";
  navigation.params = {};
  vi.mocked(signIn).mockImplementation(async email => {
    saveAppSession({ token: "app-token", email, expiresAt: future() });
    return "signed_in";
  });
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(listMembers).mockResolvedValue({ members: [], invitations: [] });
  vi.mocked(getPlans).mockResolvedValue([
    { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the /app session guard", () => {
  it.each<[string, () => ReactElement]>([
    ["/app", () => <AppHome />],
    ["/app/billing", () => <BillingPage />],
    ["/app/billing/mock-checkout", () => <MockCheckoutPage />],
    ["/app/members", () => <MembersPage />],
    ["/app/settings", () => <SettingsPage />],
    ["/app/admin", () => <AdminPage />],
  ])("sends %s to the login when there is no session, and asks the API nothing", async (pathname, page) => {
    inApp(pathname, page());
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/login"));
    expect(getMe).not.toHaveBeenCalled();
    expect(listAnalyses).not.toHaveBeenCalled();
    expect(listMembers).not.toHaveBeenCalled();
    expect(getPlans).not.toHaveBeenCalled();
  });

  it("drops a session the API refuses and sends the user to the login", async () => {
    signedIn(org());
    vi.mocked(getMe).mockRejectedValue(new ApiError("unauthorized", "Invalid or missing session token"));
    inApp("/app", <AppHome />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/login"));
    expect(loadAppSession()).toBeNull();
  });

  it.each<[string, () => ReactElement]>([
    ["/app/login", () => <LoginPage />],
    ["/app/signup", () => <SignupPage />],
    ["/app/invite/inv_token", () => <InvitePage />],
  ])("lets %s open without a session", async (pathname, page) => {
    navigation.params = { token: "inv_token" };
    inApp(pathname, page());
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(getMe).not.toHaveBeenCalled();
  });

  it("shows the active organization and signs out", async () => {
    signedIn(org({ name: "Smith Law" }));
    inApp("/app", <AppHome />);
    expect(await screen.findByText("Smith Law")).toBeTruthy();
    await userEvent.click(button("Sign out"));
    expect(loadAppSession()).toBeNull();
    expect(navigation.router.replace).toHaveBeenCalledWith("/app/login");
  });
});

describe("the /app frame under the debug strip", () => {
  // The strip is fixed at the top: one text-xs line (1rem) with py-1, so 1.5rem, which pt-6 clears.
  it.each(["mock", "live-debug"])("leaves room for the strip in %s", mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    const { container } = inApp("/app/login", <LoginPage />);
    expect((container.firstElementChild as HTMLElement).className).toContain("pt-6");
  });

  it.each([undefined, "production"])("adds no room when the mode is %s, which has no strip", mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    const { container } = inApp("/app/login", <LoginPage />);
    expect((container.firstElementChild as HTMLElement).className).not.toContain("pt-6");
  });
});

describe("the organization panel", () => {
  it("goes to billing when the API answers 402 for the analyses", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    vi.mocked(listAnalyses).mockRejectedValue(new ApiError("payment_required", "This organization has no active subscription"));
    inApp("/app", <AppHome />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/billing"));
    expect(listAnalyses).toHaveBeenCalledExactlyOnceWith("org_1");
  });

  it("shows each claimed analysis with its score, tier and domains", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([analysis()]);
    inApp("/app", <AppHome />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" })).toBeTruthy();
    expect(screen.getByText("GUARDED")).toBeTruthy();
    expect(screen.getByText("data_protection")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add an analysis/ }).getAttribute("href")).toBe("/quote");
  });

  it("keeps the results page's disclosures on a claimed assessment: demo model, partial evidence and the action plan", async () => {
    signedIn(org());
    const assessment = fixtureAssessmentResult();
    assessment.domains[0] = { ...assessment.domains[0], label: "Governance", weight: 25, status: "PARTIAL" };
    assessment.actionPlan = [
      { id: "policy", domain: "governance", title: "Document the policy", detail: "Create a written policy.", pointsGain: 5 },
      { id: "training", domain: "training", title: "Train the team", detail: "Run a session.", pointsGain: 3 },
    ];
    vi.mocked(listAnalyses).mockResolvedValue([{ ...analysis(), assessment }]);
    inApp("/app", <AppHome />);
    await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" });
    expect(screen.getByText(/demo scoring model/i).textContent).toMatch(
      /Commercial decisions are blocked for this demo.*does not establish eligibility for insurance/,
    );
    expect(screen.getByText("25% weight · partial evidence")).toBeTruthy();
    const plan = screen.getByRole("list", { name: "Action plan" });
    expect(plan.tagName).toBe("OL");
    expect([...plan.querySelectorAll("li")].map(item => item.textContent)).toEqual([
      expect.stringContaining("Document the policy"),
      expect.stringContaining("Train the team"),
    ]);
  });

  it("says a scan-only analysis has too little evidence for a decision when the scan withheld it", async () => {
    signedIn(org());
    const layer1 = fixtureResult({ scanId: "sc_demo" });
    layer1.preScore = { ...layer1.preScore, decision: "UNKNOWN", assessmentStatus: "INSUFFICIENT_EVIDENCE" };
    vi.mocked(listAnalyses).mockResolvedValue([{ ...analysis(), layer1, assessment: null }]);
    inApp("/app", <AppHome />);
    expect(await screen.findByText(/not enough evidence in this scan for a coverage decision/i)).toBeTruthy();
    expect(screen.getByText(/demo scoring model/i)).toBeTruthy();
  });

  it("warns that a deletion is pending while access continues", async () => {
    signedIn(org({ deletionPending: true }));
    inApp("/app", <AppHome />);
    expect(await screen.findByText(/deletion request is pending review/i)).toBeTruthy();
    expect(listAnalyses).toHaveBeenCalledOnce();
  });

  it("tells a user without organizations to complete an analysis, with a link to /quote", async () => {
    signedIn();
    inApp("/app", <AppHome />);
    expect(await screen.findByText("Complete an analysis to create your organization")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Start an analysis/ }).getAttribute("href")).toBe("/quote");
    expect(listAnalyses).not.toHaveBeenCalled();
  });

  it("opens the organization the user was last in", async () => {
    signedIn(org({ id: "org_1", name: "First Firm" }), org({ id: "org_2", name: "Second Firm" }));
    localStorage.setItem("arca.app.org", "org_2");
    inApp("/app", <AppHome />);
    await waitFor(() => expect(listAnalyses).toHaveBeenCalledWith("org_2"));
  });
});

describe("switching organization in the header", () => {
  const first = org({ id: "org_1", name: "First Firm" });
  const second = org({ id: "org_2", name: "Second Firm" });

  it("on the panel, shows only the new organization's analyses or error", async () => {
    signedIn(first, second);
    vi.mocked(listAnalyses).mockImplementation(async id => {
      if (id === "org_1") return [analysis()];
      throw new ApiError("forbidden", "Your role does not allow this");
    });
    inApp("/app", <AppHome />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" })).toBeTruthy();
    await userEvent.selectOptions(select("Organization"), "org_2");
    expect((await screen.findByRole("alert")).textContent).toContain("Your role does not allow this");
    expect(screen.queryByRole("img", { name: /AI Governance Score/ })).toBeNull();
    expect(screen.getByText(/save them to Second Firm/)).toBeTruthy();
    expect(listAnalyses).toHaveBeenLastCalledWith("org_2");
  });

  it("on members, drops the previous organization's people and invite link while the new list loads", async () => {
    signedIn(first, second);
    vi.mocked(listMembers).mockImplementation(id =>
      id === "org_1"
        ? Promise.resolve({
            members: [{ userId: "u_owner", email: "owner@firstfirm.com", role: "owner", joinedAt: "2026-10-25T10:00:00.000Z" }],
            invitations: [],
          })
        : new Promise(() => {}),
    );
    vi.mocked(invite).mockResolvedValue({
      id: "inv_2", email: "new@firstfirm.com", role: "member", expiresAt: "2026-11-01T10:00:00.000Z",
      inviteUrl: "http://localhost:3000/app/invite/FirstFirmInviteToken0123456789",
    });
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@firstfirm.com");
    await userEvent.type(screen.getByLabelText("Email to invite"), "new@firstfirm.com");
    await userEvent.click(button("Send invitation"));
    await screen.findByRole("button", { name: "Copy invite link" });
    await userEvent.selectOptions(select("Organization"), "org_2");
    expect(await screen.findByText("Loading members…")).toBeTruthy();
    expect(screen.queryByText("owner@firstfirm.com")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull();
    expect(listMembers).toHaveBeenLastCalledWith("org_2");
  });

  it("on settings, does not carry a deletion requested for the previous organization", async () => {
    signedIn(first, second);
    vi.mocked(getMe)
      .mockResolvedValueOnce(me([first, second]))
      .mockResolvedValue(me([{ ...first, deletionPending: true }, second]));
    vi.mocked(requestDeletion).mockResolvedValue({
      id: "del_1", orgId: "org_1", reason: "Closing the firm", status: "pending",
      requestedAt: "2026-10-25T12:00:00.000Z", reviewedAt: null, reviewNote: null,
    });
    inApp("/app/settings", <SettingsPage />);
    await userEvent.type(await screen.findByLabelText("Reason"), "Closing the firm");
    await userEvent.click(button("Request deletion"));
    expect(await screen.findByText(/A deletion request is pending review/)).toBeTruthy();
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(2));
    await userEvent.selectOptions(select("Organization"), "org_2");
    expect(await screen.findByText("Second Firm", { selector: "dd" })).toBeTruthy();
    expect(screen.queryByText(/A deletion request is pending review/)).toBeNull();
    expect(button("Request deletion").disabled).toBe(false);
    expect(requestDeletion).toHaveBeenCalledExactlyOnceWith("org_1", "Closing the firm");
  });
});

describe("sign-up from the results", () => {
  beforeEach(() => {
    savePendingClaim({ claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() });
    navigation.query = "claim=cl_1";
  });

  it("prefills the email from the pending claim and locks it", async () => {
    inApp("/app/signup", <SignupPage />);
    const email = await screen.findByLabelText<HTMLInputElement>("Email");
    expect(email.value).toBe("owner@smithlaw.com");
    expect(email.readOnly).toBe(true);
  });

  it("creates the organization with the claim and goes on to billing", async () => {
    vi.mocked(createOrg).mockResolvedValue(org({ id: "org_new", billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/signup", <SignupPage />);
    await userEvent.type(await screen.findByLabelText("Organization name"), "Smith Law");
    await userEvent.click(button("Create organization"));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/billing"));
    expect(signIn).toHaveBeenCalledExactlyOnceWith("owner@smithlaw.com");
    expect(createOrg).toHaveBeenCalledExactlyOnceWith("Smith Law", "cl_1");
    expect(recallOrg()).toBe("org_new");
    expect(loadPendingClaim()).toBeNull();
  });

  it("keeps the claim and shows the API's reason when the organization cannot be created", async () => {
    vi.mocked(createOrg).mockRejectedValue(new ApiError("conflict", "This analysis already belongs to an organization"));
    inApp("/app/signup", <SignupPage />);
    await userEvent.type(await screen.findByLabelText("Organization name"), "Smith Law");
    await userEvent.click(button("Create organization"));
    expect((await screen.findByRole("alert")).textContent).toContain("already belongs to an organization");
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(loadPendingClaim()?.claimId).toBe("cl_1");
  });

  it("without a pending claim, sends the visitor to the funnel instead", async () => {
    sessionStorage.clear();
    inApp("/app/signup", <SignupPage />);
    expect((await screen.findByRole("link", { name: /Start an analysis/ })).getAttribute("href")).toBe("/quote");
    expect(screen.queryByLabelText("Organization name")).toBeNull();
  });
});

describe.each([undefined, "production", "live-debug"])("sign-in outside mock (mode %s)", mode => {
  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    const actual = await vi.importActual<typeof import("@/lib/app/auth")>("@/lib/app/auth");
    vi.mocked(signIn).mockImplementation(actual.signIn);
  });

  it("the login says sign-in is not available yet", async () => {
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "me@smithlaw.com");
    await userEvent.click(button("Sign in"));
    expect(await screen.findByText(NOT_AVAILABLE)).toBeTruthy();
    expect(loadAppSession()).toBeNull();
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("the login offers no platform admin sign-in", async () => {
    inApp("/app/login", <LoginPage />);
    await screen.findByLabelText("Email");
    expect(screen.queryByLabelText(/platform admin/i)).toBeNull();
  });

  it("the sign-up says the same and creates nothing", async () => {
    savePendingClaim({ claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() });
    inApp("/app/signup", <SignupPage />);
    await userEvent.type(await screen.findByLabelText("Organization name"), "Smith Law");
    await userEvent.click(button("Create organization"));
    expect(await screen.findByText(NOT_AVAILABLE)).toBeTruthy();
    expect(createOrg).not.toHaveBeenCalled();
    expect(navigation.router.push).not.toHaveBeenCalled();
  });
});

describe("login in mock", () => {
  it("signs in and opens the panel", async () => {
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "me@smithlaw.com");
    await userEvent.click(button("Sign in"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
    expect(signIn).toHaveBeenCalledExactlyOnceWith("me@smithlaw.com");
  });

  it("signs in as an ARCA platform admin and opens the admin page", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    inApp("/app/login", <LoginPage />);
    await userEvent.type(await screen.findByLabelText("Email"), "ops@arca.example");
    await userEvent.click(screen.getByLabelText(/platform admin/i));
    await userEvent.click(button("Sign in"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/admin"));
    expect(signIn).toHaveBeenCalledExactlyOnceWith("ops@arca.example", { platformAdmin: true });
  });
});

describe("the platform admin page (proof of concept)", () => {
  const monthly = { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" as const };
  const annual = { code: "annual", name: "Annual (example price)", amountCents: 499_000, currency: "usd", interval: "year" as const };
  const pending = {
    id: "del_1", orgId: "org_1", reason: "Closing the firm", status: "pending" as const,
    requestedAt: "2026-10-25T12:00:00.000Z", reviewedAt: null, reviewNote: null,
  };

  /** An ARCA person: a platform admin who belongs to no organization. */
  function staff() {
    saveAppSession({ token: "app-token", email: "ops@arca.example", expiresAt: future() });
    vi.mocked(getMe).mockResolvedValue({ user: { id: "u_ops", email: "ops@arca.example" }, organizations: [], platformAdmin: true });
  }

  beforeEach(() => {
    vi.mocked(adminListPlans).mockResolvedValue([monthly, annual]);
    vi.mocked(adminListDeletionRequests).mockResolvedValue([pending]);
    vi.mocked(adminListOrganizations).mockResolvedValue([
      { id: "org_1", name: "Smith Law", billingStatus: "active", deleted: false, members: 2 },
    ]);
  });

  it("shows Not available to someone who is not a platform admin, and asks the admin API nothing", async () => {
    signedIn();
    inApp("/app/admin", <AdminPage />);
    expect(await screen.findByText("Not available")).toBeTruthy();
    expect(screen.queryByText("Complete an analysis to create your organization")).toBeNull();
    expect(adminListPlans).not.toHaveBeenCalled();
    expect(adminListDeletionRequests).not.toHaveBeenCalled();
  });

  it("opens for a platform admin without an organization, with the plans and the deletion requests", async () => {
    staff();
    inApp("/app/admin", <AdminPage />);
    expect(await screen.findByRole("heading", { name: "Platform admin (proof of concept)" })).toBeTruthy();
    expect((await screen.findByLabelText<HTMLInputElement>("Price of Monthly (example price) in USD")).value).toBe("499.00");
    expect(screen.getByLabelText<HTMLInputElement>("Price of Annual (example price) in USD").value).toBe("4990.00");
    expect(await screen.findByText("Closing the firm")).toBeTruthy();
    expect(screen.getByText("Smith Law")).toBeTruthy();
    expect(button("Approve the deletion of Smith Law")).toBeTruthy();
    expect(button("Reject the deletion of Smith Law")).toBeTruthy();
    expect(screen.queryByText("Complete an analysis to create your organization")).toBeNull();
  });

  it("changes a plan's price with the admin API and shows the new one", async () => {
    staff();
    vi.mocked(adminUpdatePlan).mockResolvedValue({ ...monthly, amountCents: 45_000 });
    inApp("/app/admin", <AdminPage />);
    const input = await screen.findByLabelText<HTMLInputElement>("Price of Monthly (example price) in USD");
    await userEvent.clear(input);
    await userEvent.type(input, "450");
    await userEvent.click(button("Save the price of Monthly (example price)"));
    expect(await screen.findByText("Monthly (example price) now costs $450.00 / month.")).toBeTruthy();
    expect(adminUpdatePlan).toHaveBeenCalledExactlyOnceWith("monthly", { amountCents: 45_000 });
  });

  it.each([
    ["Approve", "approve", "approved"],
    ["Reject", "reject", "rejected"],
  ] as const)("%ss a pending deletion request and shows how it was closed", async (label, decision, status) => {
    staff();
    vi.mocked(adminReviewDeletion).mockResolvedValue({ ...pending, status, reviewedAt: "2026-10-25T13:00:00.000Z" });
    inApp("/app/admin", <AdminPage />);
    await userEvent.click(await screen.findByRole("button", { name: `${label} the deletion of Smith Law` }));
    expect(await screen.findByText(status)).toBeTruthy();
    expect(adminReviewDeletion).toHaveBeenCalledExactlyOnceWith("del_1", decision);
    expect(screen.queryByRole("button", { name: /the deletion of Smith Law/ })).toBeNull();
  });

  it("shows the API's reason when a review is refused", async () => {
    staff();
    vi.mocked(adminReviewDeletion).mockRejectedValue(new ApiError("conflict", "This deletion request was already reviewed"));
    inApp("/app/admin", <AdminPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Reject the deletion of Smith Law" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already reviewed");
  });
});

describe("members", () => {
  const people = {
    members: [
      { userId: "u_owner", email: "owner@smithlaw.com", role: "owner" as const, joinedAt: "2026-10-25T10:00:00.000Z" },
      { userId: "u_member", email: "member@smithlaw.com", role: "member" as const, joinedAt: "2026-10-25T11:00:00.000Z" },
    ],
    invitations: [{ id: "inv_1", email: "new@smithlaw.com", role: "viewer" as const, expiresAt: "2026-11-01T10:00:00.000Z" }],
  };
  const controls = () => [
    button("Send invitation"),
    button("Remove owner@smithlaw.com"),
    button("Remove member@smithlaw.com"),
    select("Role for owner@smithlaw.com"),
    select("Role for member@smithlaw.com"),
    button("Revoke invitation for new@smithlaw.com"),
  ];

  beforeEach(() => {
    vi.mocked(listMembers).mockResolvedValue(people);
  });

  it.each([undefined, "production"])("disables what a member's role does not allow when the mode is %s", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    signedIn(org({ role: "member" }));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(controls().map(control => control.disabled)).toEqual([true, true, true, true, true, true]);
  });

  it("disables an admin's buttons on an owner only, as canManageMember says", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
    signedIn(org({ role: "admin" }));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(controls().map(control => control.disabled)).toEqual([false, true, false, true, false, false]);
  });

  it.each(["mock", "live-debug"])("keeps every button active in %s, so the back's 403 shows", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    signedIn(org({ role: "member" }));
    vi.mocked(setMemberRole).mockRejectedValue(new ApiError("forbidden", "Your role does not allow this"));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(controls().map(control => control.disabled)).toEqual([false, false, false, false, false, false]);
    await userEvent.selectOptions(select("Role for member@smithlaw.com"), "viewer");
    expect(setMemberRole).toHaveBeenCalledExactlyOnceWith("org_1", "u_member", "viewer");
    expect((await screen.findByRole("alert")).textContent).toContain("Your role does not allow this");
  });

  it("invites someone and never shows the whole invite token", async () => {
    const token = "Zx9secretInviteToken0123456789abcdefghijkl";
    signedIn(org());
    vi.mocked(invite).mockResolvedValue({
      id: "inv_2", email: "new@smithlaw.com", role: "member", expiresAt: "2026-11-01T10:00:00.000Z",
      inviteUrl: `http://localhost:3000/app/invite/${token}`,
    });
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    await userEvent.type(screen.getByLabelText("Email to invite"), "new@smithlaw.com");
    await userEvent.click(button("Send invitation"));
    expect(await screen.findByRole("button", { name: "Copy invite link" })).toBeTruthy();
    expect(invite).toHaveBeenCalledExactlyOnceWith("org_1", "new@smithlaw.com", "member");
    expect(document.body.textContent).toContain("/app/invite/Zx9sec…");
    expect(document.body.textContent).not.toContain(token);
  });
});

describe("SaveResultsCta", () => {
  beforeEach(() => {
    rememberSession("sc_demo", "synthetic-scan-capability");
  });

  it("without a session, trades the scan token for a claim and goes to sign-up with it", async () => {
    const claim = { claimId: "cl_1", email: "owner@smithlaw.com", expiresAt: future() };
    vi.mocked(createClaim).mockResolvedValue(claim);
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results and activate your account" }));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_1"));
    expect(createClaim).toHaveBeenCalledExactlyOnceWith("synthetic-scan-capability");
    expect(loadPendingClaim()).toEqual(claim);
    expect(getMe).not.toHaveBeenCalled();
    expect(attachAnalysis).not.toHaveBeenCalled();
  });

  it("adds the analysis to a paid organization when the claim is the owner's own email, and opens the panel", async () => {
    signedIn(org({ id: "org_2", name: "Smith Law" }));
    vi.mocked(createClaim).mockResolvedValue({ claimId: "cl_2", email: "Me@SmithLaw.com", expiresAt: future() });
    vi.mocked(attachAnalysis).mockResolvedValue(analysis());
    render(<SaveResultsCta scanId="sc_demo" />);
    // Until the claim says whose analysis it is, the button does not promise either path.
    await userEvent.click(await screen.findByRole("button", { name: "Save your results" }));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app"));
    expect(createClaim).toHaveBeenCalledExactlyOnceWith("synthetic-scan-capability");
    expect(attachAnalysis).toHaveBeenCalledExactlyOnceWith("org_2", "cl_2");
    expect(loadPendingClaim()).toBeNull();
  });

  it("takes a claim made with another email to sign-up, not to the signed-in organization", async () => {
    signedIn(org({ id: "org_2", name: "Smith Law" }));
    const claim = { claimId: "cl_3", email: "someone@otherfirm.com", expiresAt: future() };
    vi.mocked(createClaim).mockResolvedValue(claim);
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results" }));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_3"));
    expect(attachAnalysis).not.toHaveBeenCalled();
    expect(loadPendingClaim()).toEqual(claim);
  });

  it.each([
    ["a viewer, whose role cannot add analyses", org({ role: "viewer" })],
    ["an organization that has not paid", org({ billingStatus: "pending_payment", paidAccess: false })],
  ])("sends %s to sign-up, and says so on the button", async (_case, target) => {
    signedIn(target);
    const claim = { claimId: "cl_4", email: "me@smithlaw.com", expiresAt: future() };
    vi.mocked(createClaim).mockResolvedValue(claim);
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results and activate your account" }));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_4"));
    expect(attachAnalysis).not.toHaveBeenCalled();
    expect(loadPendingClaim()).toEqual(claim);
  });

  it("goes to billing when the API answers 402 to the attach", async () => {
    signedIn(org({ id: "org_2" }));
    vi.mocked(createClaim).mockResolvedValue({ claimId: "cl_5", email: "me@smithlaw.com", expiresAt: future() });
    vi.mocked(attachAnalysis).mockRejectedValue(new ApiError("payment_required", "This organization has no active subscription"));
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results" }));
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/billing"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the API's reason when the analysis cannot be saved", async () => {
    vi.mocked(createClaim).mockRejectedValue(new ApiError("conflict", "This analysis already belongs to an organization"));
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results and activate your account" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already belongs to an organization");
    expect(navigation.router.push).not.toHaveBeenCalled();
  });
});

describe.each([undefined, "production", "live-debug"])("the simulated checkout (mode %s)", mode => {
  it("does not exist", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    navigation.query = "session=cs_mock_1";
    expect(() => render(<MockCheckoutPage />)).toThrow("NEXT_NOT_FOUND");
    expect(debugPay).not.toHaveBeenCalled();
  });
});

describe("the rest of the demo path", () => {
  it("pays a simulated checkout and returns to the panel", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    navigation.query = "session=cs_mock_1";
    vi.mocked(debugPay).mockResolvedValue(true);
    inApp("/app/billing/mock-checkout", <MockCheckoutPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Simulated payment" }));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app?paid=1"));
    expect(debugPay).toHaveBeenCalledExactlyOnceWith("cs_mock_1");
  });

  it("shows the plans and the billing status", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/billing", <BillingPage />);
    expect(await screen.findByText(/Monthly \(example price\)/)).toBeTruthy();
    expect(screen.getByText(/pending payment/i)).toBeTruthy();
    expect(button("Pay with Monthly (example price)").disabled).toBe(false);
  });

  it("offers a paid organization the billing portal instead of another checkout", async () => {
    signedIn(org({ billingStatus: "active", paidAccess: true }));
    vi.mocked(portal).mockResolvedValue({ url: `${window.location.origin}/#portal` });
    inApp("/app/billing", <BillingPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Manage billing" }));
    await waitFor(() => expect(window.location.hash).toBe("#portal"));
    expect(portal).toHaveBeenCalledExactlyOnceWith("org_1");
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Pay with/ })).toBeNull();
    window.history.replaceState(null, "", "/");
  });

  it("tells someone who is not the owner that only the owner manages billing", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
    signedIn(org({ role: "member", billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/billing", <BillingPage />);
    expect(await screen.findByText("Only the owner can manage billing.")).toBeTruthy();
    expect(button("Pay with Monthly (example price)").disabled).toBe(true);
  });

  it("accepts an invitation after signing in, and opens that organization", async () => {
    navigation.params = { token: "inv_token" };
    vi.mocked(acceptInvitation).mockResolvedValue(org({ id: "org_9", role: "member" }));
    inApp("/app/invite/inv_token", <InvitePage />);
    await userEvent.type(await screen.findByLabelText("Email"), "member@smithlaw.com");
    await userEvent.click(button("Sign in and accept"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app"));
    expect(signIn).toHaveBeenCalledExactlyOnceWith("member@smithlaw.com");
    expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith("inv_token");
    expect(recallOrg()).toBe("org_9");
    expect(document.body.textContent).not.toContain("inv_token");
  });

  it("requests the deletion with a reason, and deletes nothing", async () => {
    signedIn(org());
    vi.mocked(requestDeletion).mockResolvedValue({
      id: "del_1", orgId: "org_1", reason: "Closing the firm", status: "pending",
      requestedAt: "2026-10-25T12:00:00.000Z", reviewedAt: null, reviewNote: null,
    });
    inApp("/app/settings", <SettingsPage />);
    await userEvent.type(await screen.findByLabelText("Reason"), "Closing the firm");
    await userEvent.click(button("Request deletion"));
    await waitFor(() => expect(requestDeletion).toHaveBeenCalledExactlyOnceWith("org_1", "Closing the firm"));
    expect(await screen.findByText(/A deletion request is pending review/)).toBeTruthy();
    // A second request would only meet the back's 409.
    expect(button("Request deletion").disabled).toBe(true);
    expect(screen.getByLabelText<HTMLTextAreaElement>("Reason").disabled).toBe(true);
  });

  it("offers no second deletion request while one is pending, even in mock", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    signedIn(org({ deletionPending: true }));
    inApp("/app/settings", <SettingsPage />);
    expect(await screen.findByText(/A deletion request is pending review/)).toBeTruthy();
    expect(button("Request deletion").disabled).toBe(true);
    expect(screen.getByLabelText<HTMLTextAreaElement>("Reason").disabled).toBe(true);
  });
});
