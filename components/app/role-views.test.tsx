// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionItemView, ActionPlanResponse, MeResponse, OrgView, Role } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import AppHome from "@/app/app/page";
import BillingPage from "@/app/app/billing/page";
import { ApiError } from "@/lib/api/client";
import { getActionPlan, getMe, getPlans, listAnalyses, updateAction } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";
import { setShowForbidden } from "@/lib/debug/bridge";

// DN-11 §6.1 and §6.4 in the /app shell: the sidebar, the search and the page gate follow the role, the debug switch
// brings everything back in mock only, and the real action plan feeds the counter and the Overview.

const navigation = vi.hoisted(() => ({ pathname: "/app", router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

const SWITCH_KEY = "arca.debug.showForbidden";

const org = (overrides: Partial<OrgView> = {}): OrgView => ({
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true, ...overrides,
});

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  const me: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
  vi.mocked(getMe).mockResolvedValue(me);
}

function inApp(pathname: string, page: ReactElement = <p>page content</p>) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const action = (overrides: Partial<ActionItemView> & Pick<ActionItemView, "key" | "title">): ActionItemView => ({
  source: "custom", detail: null, domain: null, pointsGain: null, status: "todo", assignee: null, dueDate: null, updatedAt: null,
  ...overrides,
} as ActionItemView);

const PLAN: ActionPlanResponse = {
  source: null,
  items: [
    action({ key: "c.00000000-0000-4000-8000-000000000001", title: "Name an incident lead" }),
    action({ key: "c.00000000-0000-4000-8000-000000000002", title: "Write the AI policy", status: "in_progress" }),
    action({ key: "c.00000000-0000-4000-8000-000000000003", title: "Train the team", status: "done" }),
  ],
};

const sidebarLinks = async () => {
  const nav = await screen.findByRole("navigation", { name: "App" });
  return within(nav).getAllByRole("link").map(link => link.textContent);
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the sidebar and the search by role", () => {
  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: lists billing and the activity only to an owner or admin",
    async (role, team) => {
      signedIn(org({ role }));
      inApp("/app");
      const links = await sidebarLinks();
      expect(links).toContain("Members");
      expect(links.includes("Billing")).toBe(team);
      expect(links.includes("Activity")).toBe(team);
    },
  );

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: offers the top bar's New analysis only with analysis.create",
    async (role, offered) => {
      signedIn(org({ role }));
      inApp("/app");
      await screen.findByRole("navigation", { name: "App" });
      expect(screen.queryByRole("link", { name: "New analysis" }) !== null).toBe(offered);
    },
  );

  it("keeps the way to billing open for a member, from the plan status", async () => {
    signedIn(org({ role: "member", billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/billing");
    const status = await screen.findByRole("link", { name: /Awaiting payment/ });
    expect(status.getAttribute("href")).toBe("/app/billing");
  });

  it("searches only what the role opens", async () => {
    signedIn(org({ role: "viewer" }));
    inApp("/app");
    const search = await screen.findByRole("searchbox", { name: "Search the workspace" });
    await userEvent.type(search, "activ");
    expect(screen.getByText("No matches for “activ”.")).toBeTruthy();
    await userEvent.clear(search);
    await userEvent.type(search, "bill");
    expect(screen.getByText("No matches for “bill”.")).toBeTruthy();
    await userEvent.clear(search);
    await userEvent.type(search, "members");
    expect(within(screen.getByRole("list", { name: "Search results" })).getByText("Members")).toBeTruthy();
  });

  it("finds the plan's actions in the search", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockResolvedValue(PLAN);
    inApp("/app");
    const search = await screen.findByRole("searchbox", { name: "Search the workspace" });
    await waitFor(() => expect(getActionPlan).toHaveBeenCalled());
    await userEvent.type(search, "incident");
    const results = await screen.findByRole("list", { name: "Search results" });
    expect(within(results).getByText("Name an incident lead")).toBeTruthy();
    await userEvent.keyboard("{Enter}");
    expect(navigation.router.push).toHaveBeenCalledWith("/app/action-plan");
  });
});

describe("the page gate", () => {
  it.each<Role>(["member", "viewer"])("tells a %s their role can't open the activity, and never mounts the page", async role => {
    signedIn(org({ role }));
    inApp("/app/activity");
    expect(await screen.findByRole("heading", { name: "Your role can't open this page" })).toBeTruthy();
    expect(screen.queryByText("page content")).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Overview" }).getAttribute("href")).toBe("/app");
    // The gate takes the page's place, so it keeps the page's title as the one h1.
    expect(screen.getAllByRole("heading", { level: 1 }).map(heading => heading.textContent)).toEqual(["Activity"]);
  });

  it.each<Role>(["owner", "admin"])("opens the activity to an %s", async role => {
    signedIn(org({ role }));
    inApp("/app/activity");
    expect(await screen.findByText("page content")).toBeTruthy();
    expect(screen.queryByText("Your role can't open this page")).toBeNull();
  });
});

describe("the debug switch", () => {
  it("in mock, shows a member every page and item while it is on, and follows it as the panel flips it", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "member" }));
    inApp("/app/activity");
    expect(await screen.findByText("page content")).toBeTruthy();
    expect(await sidebarLinks()).toEqual(expect.arrayContaining(["Billing", "Activity"]));
    expect(screen.getByRole("link", { name: "New analysis" })).toBeTruthy();

    act(() => setShowForbidden(false));
    expect(await screen.findByRole("heading", { name: "Your role can't open this page" })).toBeTruthy();
    expect(await sidebarLinks()).not.toContain("Activity");

    act(() => setShowForbidden(true));
    expect(await screen.findByText("page content")).toBeTruthy();
  });

  // DN-11 §6.4: the guard is the bridge's literal comparison, so a production build never reads the key.
  it.each([undefined, "production", "live-debug"])(
    "with the key in the tab's storage and the mode %s, shows a viewer nothing it may not see",
    async mode => {
      vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
      sessionStorage.setItem(SWITCH_KEY, "1");
      signedIn(org({ role: "viewer", billingStatus: "pending_payment", paidAccess: false }));
      vi.mocked(getPlans).mockResolvedValue([
        { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" },
      ]);

      const gate = inApp("/app/activity");
      expect(await screen.findByRole("heading", { name: "Your role can't open this page" })).toBeTruthy();
      expect(screen.queryByText("page content")).toBeNull();
      const links = await sidebarLinks();
      expect(links).not.toContain("Activity");
      expect(links).not.toContain("Billing");
      expect(screen.queryByRole("link", { name: "New analysis" })).toBeNull();
      gate.unmount();

      inApp("/app/billing", <BillingPage />);
      expect(await screen.findByText("Only the owner can manage billing.")).toBeTruthy();
      // The plans render after the note; once they are there, the owner's Pay is still not.
      expect(await screen.findByText("Monthly (example price)")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Pay with/ })).toBeNull();
      expect(sessionStorage.getItem(SWITCH_KEY)).toBe("1");
    },
  );
});

describe("the real action plan in the shell", () => {
  it("counts the open actions of a paid organization next to Action plan", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockResolvedValue(PLAN);
    inApp("/app");
    expect(await screen.findByLabelText("2 open actions")).toBeTruthy();
    expect(getActionPlan).toHaveBeenCalledExactlyOnceWith("org_1");
  });

  it("asks nothing for an organization that has not paid", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/billing");
    await screen.findByRole("navigation", { name: "App" });
    expect(getActionPlan).not.toHaveBeenCalled();
  });

  it.each([
    ["402", new ApiError("payment_required", "This organization has no active subscription")],
    ["403", new ApiError("forbidden", "Your role does not allow this")],
  ])("on a %s, leaves the counter out and never redirects", async (_status, failure) => {
    signedIn(org());
    vi.mocked(getActionPlan).mockRejectedValue(failure);
    inApp("/app/members");
    await waitFor(() => expect(getActionPlan).toHaveBeenCalled());
    await screen.findByRole("navigation", { name: "App" });
    expect(screen.queryByLabelText(/open actions/)).toBeNull();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("starts over for the organization the user switches to", async () => {
    signedIn(org({ id: "org_1", name: "First Firm" }), org({ id: "org_2", name: "Second Firm" }));
    vi.mocked(getActionPlan).mockImplementation(async id => (id === "org_1" ? PLAN : { source: null, items: [] }));
    inApp("/app");
    expect(await screen.findByLabelText("2 open actions")).toBeTruthy();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Organization" }), "org_2");
    await waitFor(() => expect(getActionPlan).toHaveBeenLastCalledWith("org_2"));
    await waitFor(() => expect(screen.queryByLabelText(/open actions/)).toBeNull());
  });

  it("lets the Overview mark an action done, and reads the plan again", async () => {
    signedIn(org({ role: "member" }));
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue({
      ...PLAN, items: PLAN.items.map(item => ({ ...item, status: "done" as const })),
    });
    vi.mocked(updateAction).mockResolvedValue({ ...PLAN.items[0], status: "done" });
    inApp("/app", <AppHome />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Mark “Name an incident lead” as done" }));
    expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", PLAN.items[0].key, { status: "done" });
    expect(await screen.findByText("Every action is done.")).toBeTruthy();
    expect(getActionPlan).toHaveBeenCalledTimes(2);
  });

  it("gives a viewer the Overview's next actions without boxes", async () => {
    signedIn(org({ role: "viewer" }));
    vi.mocked(getActionPlan).mockResolvedValue(PLAN);
    inApp("/app", <AppHome />);
    const list = await screen.findByRole("list", { name: "Next actions" });
    expect(await within(list).findByText("Name an incident lead")).toBeTruthy();
    expect(within(list).queryByRole("checkbox")).toBeNull();
  });
});
