// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionItemView, ActionPlanResponse, AnalysisView, MeResponse, OrgView, Role } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import AppHome from "@/app/app/page";
import AnalysesPage from "@/app/app/analyses/page";
import AnalysisDetailPage from "@/app/app/analyses/[scanId]/page";
import SaveResultsCta from "@/components/app/SaveResultsCta";
import { ApiError } from "@/lib/api/client";
import { fixtureResult } from "@/lib/api/fixture";
import { rememberSession } from "@/lib/api/session";
import { attachAnalysis, createClaim, getActionPlan, getMe, listAnalyses, updateAction } from "@/lib/app/client";
import { loadPendingClaim, saveAppSession } from "@/lib/app/session";
import { fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";

// DN-11 §6.2 and §6.3 for the Overview and the analyses: what each role sees card by card, every way to /quote following
// analysis.create, the debug switch bringing it all back in mock only, and the analysis the real plan comes from.

const navigation = vi.hoisted(() => ({
  pathname: "/app",
  params: {} as Record<string, string>,
  router: { replace: vi.fn(), push: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => navigation.params,
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

const SWITCH_KEY = "arca.debug.showForbidden";
const ROLES: Role[] = ["owner", "admin", "member", "viewer"];
const TEAM: Role[] = ["owner", "admin"];
const future = () => new Date(Date.now() + 3_600_000).toISOString();

const org = (overrides: Partial<OrgView> = {}): OrgView => ({
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true, ...overrides,
});

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  const me: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
  vi.mocked(getMe).mockResolvedValue(me);
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

function assessed(scanId = "sc_demo", claimedAt = "2026-10-25T10:00:00.000Z"): AnalysisView {
  return {
    scanId, domain: "smithlaw.com", scanStatus: "COMPLETED", claimedAt, layer1: fixtureResult({ scanId }),
    assessment: fixtureAssessmentResult(),
  };
}

function scanOnly(): AnalysisView {
  return {
    scanId: "sc_branch", domain: "branch.smithlaw.com", scanStatus: "COMPLETED", claimedAt: "2026-10-20T10:00:00.000Z",
    layer1: fixtureResult({ scanId: "sc_branch", domain: "branch.smithlaw.com" }), assessment: null,
  };
}

const action = (overrides: Partial<ActionItemView> & Pick<ActionItemView, "key" | "title">): ActionItemView => ({
  source: "custom", detail: null, domain: null, pointsGain: null, status: "todo", assignee: null, dueDate: null, updatedAt: null,
  ...overrides,
} as ActionItemView);

const ME = { userId: "u_me", email: "me@smithlaw.com" };
const OTHER = { userId: "u_other", email: "other@smithlaw.com" };
const SOURCE = { scanId: "sc_demo", domain: "smithlaw.com", claimedAt: "2026-10-25T10:00:00.000Z" };

// Four open actions, two of them the signed-in user's, and one done.
const PLAN: ActionPlanResponse = {
  source: SOURCE,
  items: [
    action({ key: "c.00000000-0000-4000-8000-000000000001", title: "Name an incident lead", assignee: OTHER }),
    action({ key: "c.00000000-0000-4000-8000-000000000002", title: "Write the AI policy", status: "in_progress", assignee: ME }),
    action({ key: "c.00000000-0000-4000-8000-000000000003", title: "Train the team", status: "done", assignee: ME }),
    action({ key: "c.00000000-0000-4000-8000-000000000004", title: "Review vendor terms" }),
    action({ key: "c.00000000-0000-4000-8000-000000000005", title: "Pick an approved tool", assignee: ME }),
  ],
};

const STAT_LABELS = ["My open actions", "Open actions", "Unread alerts", "Team members", "Coverage"];
/** The indicator cards of the Overview, in order, by their label. */
const statLabels = () =>
  within(screen.getByRole("region", { name: "Key figures" }))
    .getAllByRole("link")
    .map(card => STAT_LABELS.find(label => card.textContent?.includes(label)));
/** The quick actions below the card's own button, in order. */
const quickActions = () =>
  within(screen.getByRole("list", { name: "Quick actions" }))
    .getAllByRole("listitem")
    .map(item => item.textContent?.replace("Coming soon", "").trim());

/** The Overview once both the latest analysis and the real plan are on screen. */
async function overview() {
  inApp("/app", <AppHome />);
  await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" });
  return within(screen.getByRole("list", { name: "Next actions" })).findByText("Write the AI policy");
}

const nextTitles = () =>
  within(screen.getByRole("list", { name: "Next actions" }))
    .getAllByRole("listitem")
    .map(item => item.querySelector("p")?.textContent);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  navigation.params = {};
  vi.mocked(listAnalyses).mockResolvedValue([assessed()]);
  vi.mocked(getActionPlan).mockResolvedValue(PLAN);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the Overview by role", () => {
  it.each<Role>(TEAM)("gives an %s every card, every quick action and the boxes", async role => {
    signedIn(org({ role }));
    await overview();
    expect(statLabels()).toEqual(["Open actions", "Unread alerts", "Team members", "Coverage"]);
    expect(screen.getByRole("link", { name: /^Run a new analysis$/ }).getAttribute("href")).toBe("/quote");
    expect(screen.getByRole("link", { name: /Add an analysis/ }).getAttribute("href")).toBe("/quote");
    // §6.3: all of them, help included.
    expect(quickActions()).toEqual([
      "Invite a teammate", "Download full report", "Talk to a broker", "Book a call with ARCA", "Help & support",
    ]);
    // The plan's order, whoever each action is assigned to.
    expect(nextTitles()).toEqual(["Name an incident lead", "Write the AI policy", "Review vendor terms"]);
    expect(within(screen.getByRole("list", { name: "Next actions" })).getAllByRole("checkbox")).toHaveLength(3);
  });

  it("gives a member their own open actions first, with boxes, and only a call and help", async () => {
    signedIn(org({ role: "member" }));
    await overview();
    expect(statLabels()).toEqual(["My open actions", "Unread alerts", "Coverage"]);
    const mine = within(screen.getByRole("region", { name: "Key figures" })).getByRole("link", { name: /My open actions/ });
    expect(mine.textContent).toMatch(/My open actions\s*2\s*4 open in the whole plan/);
    expect(nextTitles()).toEqual(["Write the AI policy", "Pick an approved tool", "Name an incident lead"]);
    expect(screen.getByText("The ones assigned to you come first.")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Next actions" })).getAllByText("Assigned to you")).toHaveLength(2);
    expect(within(screen.getByRole("list", { name: "Next actions" })).getAllByRole("checkbox")).toHaveLength(3);
    expect(quickActions()).toEqual(["Book a call with ARCA", "Help & support"]);
    expect(within(screen.getByRole("list", { name: "Quick actions" })).getByRole("link", { name: /Help & support/ }).getAttribute("href"))
      .toBe("/app/help");
    expect(screen.queryByRole("link", { name: /Run a new analysis/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Add an analysis/ })).toBeNull();
    expect(screen.getByText("New analyses are run by an owner or admin of Smith Law.")).toBeTruthy();
  });

  it("gives a viewer the open actions and coverage, the list without boxes, and only a call", async () => {
    signedIn(org({ role: "viewer" }));
    await overview();
    expect(statLabels()).toEqual(["Open actions", "Coverage"]);
    expect(nextTitles()).toEqual(["Name an incident lead", "Write the AI policy", "Review vendor terms"]);
    expect(within(screen.getByRole("list", { name: "Next actions" })).queryByRole("checkbox")).toBeNull();
    expect(quickActions()).toEqual(["Book a call with ARCA"]);
    expect(screen.queryByRole("link", { name: /Run a new analysis/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Add an analysis/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Talk to a broker" })).toBeNull();
  });

  it.each(ROLES)("shows a %s the latest analysis, the trend, the benchmark and monitoring, and no billing card", async role => {
    signedIn(org({ role }));
    await overview();
    expect(screen.getByRole("heading", { name: "Latest analysis" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Score trend" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Benchmark" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Recent alerts" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Key figures" })).queryByText(/billing|payment|subscription/i)).toBeNull();
    // DN-11 D16, in the Action plan's words.
    expect(screen.getByText("Marking an action done doesn't change your score. A new analysis updates the score.")).toBeTruthy();
  });

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: offers a first analysis from the empty Overview only with analysis.create",
    async (role, offered) => {
      signedIn(org({ role }));
      vi.mocked(listAnalyses).mockResolvedValue([]);
      inApp("/app", <AppHome />);
      expect(await screen.findByText("No analyses saved yet.")).toBeTruthy();
      // The header's button and the empty state's.
      expect(screen.queryAllByRole("link", { name: /^Run a new analysis$/ })).toHaveLength(offered ? 2 : 0);
      expect(screen.queryByText("Analyses show here once they are saved to Smith Law.") === null).toBe(offered);
      // Who runs them is said once, in Quick actions (DN-11 §6.1).
      expect(screen.queryAllByText(/owner or admin of Smith Law/)).toHaveLength(offered ? 0 : 1);
    },
  );
});

describe("the Overview's next actions", () => {
  const box = (title: string) => screen.getByRole<HTMLInputElement>("checkbox", { name: `Mark “${title}” as done` });

  it("ticks the box while it is sent, sends one change for a double click, and keeps the focus on the list", async () => {
    signedIn(org({ role: "member" }));
    let answer!: (action: ActionItemView) => void;
    vi.mocked(updateAction).mockReturnValue(new Promise(resolve => (answer = resolve)));
    const policy = PLAN.items[1];
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue({
      ...PLAN, items: PLAN.items.map(item => (item.key === policy.key ? { ...item, status: "done" as const } : item)),
    });
    await overview();
    const user = userEvent.setup();

    await user.click(box("Write the AI policy"));
    expect(box("Write the AI policy").checked).toBe(true);
    await user.click(box("Write the AI policy"));
    expect(box("Write the AI policy").checked).toBe(true);
    expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", policy.key, { status: "done" });

    answer({ ...policy, status: "done" });
    expect(await screen.findByText("“Write the AI policy” marked as done.")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Next actions" });
    await waitFor(() => expect(within(list).queryByText("Write the AI policy")).toBeNull());
    expect(document.activeElement).toBe(list);
    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(getActionPlan).toHaveBeenCalledTimes(2);
  });

  it("unticks the box and says why when the change is refused", async () => {
    signedIn(org({ role: "member" }));
    vi.mocked(updateAction).mockRejectedValue(new ApiError("rate_limited", "Too many changes to the action plan; try again in a minute", 60));
    await overview();
    const user = userEvent.setup();

    await user.click(box("Write the AI policy"));
    expect(await screen.findByText("Too many changes to the action plan; try again in a minute")).toBeTruthy();
    await waitFor(() => expect(box("Write the AI policy").checked).toBe(false));
    expect(document.activeElement).toBe(box("Write the AI policy"));
  });
});

describe("the Overview with the debug switch", () => {
  it("in mock, gives a member every quick action and a viewer the boxes, while the cards stay the role's", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "member" }));
    const member = inApp("/app", <AppHome />);
    await within(await screen.findByRole("list", { name: "Next actions" })).findByText("Write the AI policy");
    expect(screen.getByRole("link", { name: /^Run a new analysis$/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add an analysis/ })).toBeTruthy();
    expect(quickActions()).toEqual([
      "Invite a teammate", "Download full report", "Talk to a broker", "Book a call with ARCA", "Help & support",
    ]);
    expect(statLabels()).toEqual(["My open actions", "Unread alerts", "Coverage"]);
    member.unmount();

    signedIn(org({ role: "viewer" }));
    inApp("/app", <AppHome />);
    const list = await screen.findByRole("list", { name: "Next actions" });
    await within(list).findByText("Write the AI policy");
    expect(within(list).getAllByRole("checkbox")).toHaveLength(3);
  });

  it.each([undefined, "production", "live-debug"])("with the key in the tab's storage and the mode %s, hides from a viewer what it may not do", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "viewer" }));
    await overview();
    expect(within(screen.getByRole("list", { name: "Next actions" })).queryByRole("checkbox")).toBeNull();
    expect(quickActions()).toEqual(["Book a call with ARCA"]);
    expect(screen.queryByRole("link", { name: /Run a new analysis/ })).toBeNull();
  });
});

describe("the analysis the action plan comes from", () => {
  it("links the Overview's latest analysis to the Action plan when the plan comes from it, keeping its static list", async () => {
    signedIn(org({ role: "viewer" }));
    inApp("/app", <AppHome />);
    const track = await screen.findByRole("link", { name: "Track these in the Action plan" });
    expect(track.getAttribute("href")).toBe("/app/action-plan");
    expect(within(screen.getByRole("list", { name: "Action plan" })).getByText(/Document the policy/)).toBeTruthy();
  });

  it("does not link an analysis when the plan could not be read", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockRejectedValue(new ApiError("forbidden", "Your role does not allow this"));
    inApp("/app", <AppHome />);
    expect(await screen.findByText("The action plan could not be loaded.")).toBeTruthy();
    await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" });
    expect(screen.getByRole("list", { name: "Action plan" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Track these in the Action plan" })).toBeNull();
    // Without a plan there is no count to give, not even of the actions done.
    const open = within(screen.getByRole("region", { name: "Key figures" })).getByRole("link", { name: /^Open actions/ });
    expect(open.textContent).toMatch(/Open actions\s*—\s*In the action plan/);
    expect(open.textContent).not.toMatch(/done/);
  });

  it("on the current analysis's detail, links both tabs to the Action plan", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed("sc_old", "2026-10-01T10:00:00.000Z"), assessed()]);
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    expect(await screen.findByRole("link", { name: "Track these in the Action plan" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: /Action plan/ }));
    expect(screen.getByText(/^Recommended at the time of this analysis/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Track these in the Action plan" }).getAttribute("href")).toBe("/app/action-plan");
    expect(screen.queryByText(/not tracked there/)).toBeNull();
  });

  it("on an older analysis's detail, says its actions are what was recommended then and are not tracked", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([assessed("sc_old", "2026-10-01T10:00:00.000Z"), assessed()]);
    navigation.params = { scanId: "sc_old" };
    inApp("/app/analyses/sc_old", <AnalysisDetailPage />);
    await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" });
    await waitFor(() => expect(getActionPlan).toHaveBeenCalled());
    expect(screen.getByRole("list", { name: "Action plan" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Track these in the Action plan" })).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: /Action plan/ }));
    expect(screen.getByText(/^Recommended at the time of this analysis/)).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Recommended actions" })).getByText("Document the policy")).toBeTruthy();
    expect(await screen.findByText(/these actions are not tracked there/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Track these in the Action plan" })).toBeNull();
  });
});

describe("the analyses list by role", () => {
  it.each<Role>(ROLES)("%s: reads every analysis, and runs or re-runs one only with analysis.create", async role => {
    const team = TEAM.includes(role);
    signedIn(org({ role }));
    vi.mocked(listAnalyses).mockResolvedValue([assessed(), scanOnly()]);
    inApp("/app/analyses", <AnalysesPage />);
    const table = await screen.findByRole("table", { name: "Saved analyses" });
    expect(within(table).getByRole("link", { name: "View smithlaw.com" }).getAttribute("href")).toBe("/app/analyses/sc_demo");
    expect(within(table).getByRole("link", { name: "View branch.smithlaw.com" })).toBeTruthy();
    expect(within(table).getAllByRole("checkbox", { name: /^Compare/ })).toHaveLength(2);
    expect(within(table).queryAllByRole("link", { name: /^Re-run/ })).toHaveLength(team ? 2 : 0);
    expect(screen.queryByRole("link", { name: /^Run a new analysis$/ }) !== null).toBe(team);
    expect(screen.queryByText("Ask an owner or admin to run a new analysis.") === null).toBe(team);
  });

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: offers a first analysis from the empty list only with analysis.create",
    async (role, offered) => {
      signedIn(org({ role }));
      vi.mocked(listAnalyses).mockResolvedValue([]);
      inApp("/app/analyses", <AnalysesPage />);
      expect(await screen.findByText("No analyses saved yet.")).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Run your first analysis" }) !== null).toBe(offered);
    },
  );

  it("in mock with the switch on, gives a viewer the way to /quote back", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "viewer" }));
    inApp("/app/analyses", <AnalysesPage />);
    const table = await screen.findByRole("table", { name: "Saved analyses" });
    expect(within(table).getByRole("link", { name: "Re-run smithlaw.com" }).getAttribute("href")).toBe("/quote");
    expect(screen.getByRole("link", { name: /^Run a new analysis$/ })).toBeTruthy();
    expect(screen.queryByText("Ask an owner or admin to run a new analysis.")).toBeNull();
  });
});

describe("the analysis detail by role", () => {
  it.each<Role>(ROLES)("%s: shows the analysis, and re-runs it only with analysis.create", async role => {
    const team = TEAM.includes(role);
    signedIn(org({ role }));
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    expect(await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^Re-run$/ }) !== null).toBe(team);
    expect(screen.queryByText("Ask an owner or admin to run a new analysis.") === null).toBe(team);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Download report/ }).disabled).toBe(true);
  });

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: offers the assessment a scan lacks only with analysis.create",
    async (role, offered) => {
      signedIn(org({ role }));
      vi.mocked(listAnalyses).mockResolvedValue([scanOnly()]);
      navigation.params = { scanId: "sc_branch" };
      inApp("/app/analyses/sc_branch", <AnalysisDetailPage />);
      await userEvent.click(await screen.findByRole("tab", { name: /Action plan/ }));
      expect(screen.getByText("No assessment yet")).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Run a scan and assessment" }) !== null).toBe(offered);
    },
  );

  it("in mock with the switch on, gives a viewer Re-run back", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "viewer" }));
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    expect((await screen.findByRole("link", { name: /^Re-run$/ })).getAttribute("href")).toBe("/quote");
    expect(screen.queryByText("Ask an owner or admin to run a new analysis.")).toBeNull();
  });

  it("says who runs a new analysis in the read-only notice", async () => {
    signedIn(org({ role: "viewer" }));
    navigation.params = { scanId: "sc_demo" };
    inApp("/app/analyses/sc_demo", <AnalysisDetailPage />);
    const notice = await screen.findByText("Ask an owner or admin to run a new analysis.");
    expect(notice.querySelector("svg")).toBeTruthy();
  });
});

describe("SaveResultsCta for a member or a viewer", () => {
  beforeEach(() => {
    rememberSession("sc_demo", "synthetic-scan-capability");
  });

  it("asks someone not signed in to activate an account, and someone signed in only to start an organization", async () => {
    const anonymous = render(<SaveResultsCta scanId="sc_demo" />);
    expect(await screen.findByRole("button", { name: "Save your results and activate your account" })).toBeTruthy();
    anonymous.unmount();

    signedIn(org({ role: "viewer" }));
    render(<SaveResultsCta scanId="sc_demo" />);
    expect(await screen.findByRole("button", { name: "Save your results to a new organization" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /activate your account/ })).toBeNull();
  });

  it.each<Role>(["member", "viewer"])("sends a %s of the active organization to create a new one, and says why", async role => {
    signedIn(org({ role }));
    const claim = { claimId: "cl_6", email: "me@smithlaw.com", expiresAt: future() };
    vi.mocked(createClaim).mockResolvedValue(claim);
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results to a new organization" }));
    expect(screen.getByText(/^Your role in Smith Law does not add analyses\./)).toBeTruthy();
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_6"));
    expect(attachAnalysis).not.toHaveBeenCalled();
    expect(loadPendingClaim()).toEqual(claim);
  });

  it("looks at the active organization only: a member there is not saved to another organization they own", async () => {
    signedIn(org({ id: "org_1", name: "First Firm", role: "owner" }), org({ id: "org_2", name: "Second Firm", role: "member" }));
    localStorage.setItem("arca.app.org", "org_2");
    vi.mocked(createClaim).mockResolvedValue({ claimId: "cl_7", email: "me@smithlaw.com", expiresAt: future() });
    render(<SaveResultsCta scanId="sc_demo" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save your results to a new organization" }));
    expect(screen.getByText(/^Your role in Second Firm does not add analyses\./)).toBeTruthy();
    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledWith("/app/signup?claim=cl_7"));
    expect(attachAnalysis).not.toHaveBeenCalled();
  });

  it("does not blame the role when the active organization only lacks payment", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    render(<SaveResultsCta scanId="sc_demo" />);
    await screen.findByRole("button", { name: "Save your results to a new organization" });
    expect(screen.getByText("Create your organization to keep this analysis and invite your colleagues.")).toBeTruthy();
    expect(screen.queryByText(/does not add analyses/)).toBeNull();
  });
});
