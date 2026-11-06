// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ActivityEventView, AdminAuditEventView, AdminMetricsView, AdminOrgDetailView, MeResponse, OrgView, Role,
} from "@arca/contracts";

import ActivityPage from "@/app/app/activity/page";
import AdminPage from "@/app/app/admin/page";
import AppLayout from "@/app/app/layout";
import { ApiError } from "@/lib/api/client";
import {
  adminGetMetrics, adminGetOrganization, adminListAudit, adminListDeletionRequests, adminListOrganizations, adminListPlans,
  getActionPlan, getMe, listActivity, listAnalyses,
} from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

// DN-11 §6.4 for the organization's activity and ARCA's panel, each role through the /app layout: the activity is real and
// only for activity.read, and /app/admin keeps DN-10's Operations as its default tab next to the new read-only ones.

const navigation = vi.hoisted(() => ({ pathname: "/app", router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

// The first render of the file is cold and, with every file of the suite running at once, takes longer than the default
// second to show anything; the waits here are for data the mocks already hold, so a longer limit hides no slowness.
configure({ asyncUtilTimeout: 5000 });

const SWITCH_KEY = "arca.debug.showForbidden";

const org = (overrides: Partial<OrgView> = {}): OrgView => ({
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true, ...overrides,
});

function signedIn(organizations: OrgView[], platformAdmin = false) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  const me: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin };
  vi.mocked(getMe).mockResolvedValue(me);
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const event = (overrides: Partial<ActivityEventView> & Pick<ActivityEventView, "id" | "action">): ActivityEventView => ({
  at: "2026-10-13T10:00:00.000Z", actor: { kind: "member", email: "owner@smithlaw.com" }, targetLabel: null, change: null,
  ...overrides,
});

const EVENTS: ActivityEventView[] = [
  event({
    id: "e5", action: "member.role_changed", targetLabel: "member@smithlaw.com", change: { from: "member", to: "admin" },
  }),
  event({
    id: "e4", action: "action.updated", actor: { kind: "member", email: "member@smithlaw.com" },
    targetLabel: "Write the AI policy", change: { from: "todo", to: "done" },
  }),
  event({ id: "e3", action: "org.deletion_rejected", actor: { kind: "arca", email: null }, at: "2026-10-12T09:30:00.000Z" }),
  event({ id: "e2", action: "billing.event_applied", actor: { kind: "system", email: null }, at: "2026-10-12T09:00:00.000Z" }),
  event({
    id: "e1", action: "org.created", targetLabel: "Smith Law", change: { from: null, to: "Smith Law" },
    at: "2026-10-11T08:00:00.000Z",
  }),
];

const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });
const select = (name: string) => screen.getByRole<HTMLSelectElement>("combobox", { name });
// The actor's name is the one span of its sentence; the person filter repeats it in an option.
const actor = (name: string) => screen.getByText(name, { selector: "span" });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [] });
  vi.mocked(listActivity).mockResolvedValue({ events: EVENTS, nextBefore: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the organization's activity", () => {
  it.each<Role>(["owner", "admin"])("shows an %s the real log, without a sample label", async role => {
    signedIn([org({ role })]);
    inApp("/app/activity", <ActivityPage />);
    await screen.findByRole("heading", { name: "Activity", level: 1 });
    expect(await screen.findByText("changed the role of member@smithlaw.com")).toBeTruthy();
    expect(listActivity).toHaveBeenCalledExactlyOnceWith("org_1");
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(button(/Export CSV/).disabled).toBe(true);
  });

  it.each<Role>(["member", "viewer"])("never mounts for a %s, and asks the API nothing", async role => {
    signedIn([org({ role })]);
    inApp("/app/activity", <ActivityPage />);
    expect(await screen.findByRole("heading", { name: "Your role can't open this page" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Activity", level: 1 })).toBeNull();
    expect(listActivity).not.toHaveBeenCalled();
  });

  it("opens for an owner whose organization has not paid, since the activity takes no payment", async () => {
    signedIn([org({ billingStatus: "pending_payment", paidAccess: false })]);
    inApp("/app/activity", <ActivityPage />);
    expect(await screen.findByText("changed the role of member@smithlaw.com")).toBeTruthy();
    expect(screen.queryByText(/Choose a plan to unlock/)).toBeNull();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("names members by email and ARCA staff and the system by kind only, with each change in words", async () => {
    signedIn([org()]);
    inApp("/app/activity", <ActivityPage />);
    await screen.findByText("changed the role of member@smithlaw.com");
    expect(screen.getByText("Role: Member → Admin")).toBeTruthy();
    expect(screen.getByText("updated the action Write the AI policy")).toBeTruthy();
    expect(screen.getByText("Status: To do → Done")).toBeTruthy();
    expect(actor("ARCA staff")).toBeTruthy();
    expect(screen.getByText("turned down the deletion of the organization")).toBeTruthy();
    expect(actor("System")).toBeTruthy();
    expect(screen.getByText("recorded a billing update")).toBeTruthy();
    // A value that was not there before shows alone.
    expect(screen.getByText("Name: Smith Law")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Oct 12, 2026" })).toBeTruthy();
    expect(screen.getAllByText("10:00 AM UTC")).toHaveLength(2);
    expect(screen.getByRole("main").textContent).not.toMatch(/arca\.example/);
  });

  it("filters by person and by event type", async () => {
    signedIn([org()]);
    inApp("/app/activity", <ActivityPage />);
    await screen.findByText("changed the role of member@smithlaw.com");
    const user = userEvent.setup();

    const people = [...select("Filter by person").options].map(option => option.textContent);
    expect(people).toEqual(["Everyone", "owner@smithlaw.com", "member@smithlaw.com", "ARCA staff", "System"]);

    await user.click(button(/^Organization/));
    expect(screen.getByText("created the organization")).toBeTruthy();
    expect(screen.queryByText("changed the role of member@smithlaw.com")).toBeNull();

    await user.click(button(/^All/));
    await user.selectOptions(select("Filter by person"), "member@smithlaw.com");
    expect(screen.getByText("updated the action Write the AI policy")).toBeTruthy();
    expect(screen.queryByText("created the organization")).toBeNull();
    // The pills count what the person filter leaves.
    expect(button(/^Action plan/).textContent).toBe("Action plan1");
    expect(button(/^Members/).textContent).toBe("Members0");

    await user.click(button(/^Members/));
    expect(screen.getByText("No activity matches these filters.")).toBeTruthy();
  });

  it("loads older events with nextBefore, until there are none", async () => {
    signedIn([org()]);
    vi.mocked(listActivity)
      .mockResolvedValueOnce({ events: EVENTS.slice(0, 2), nextBefore: 3 })
      .mockResolvedValueOnce({ events: EVENTS.slice(2), nextBefore: null });
    inApp("/app/activity", <ActivityPage />);
    await screen.findByText("changed the role of member@smithlaw.com");
    expect(screen.queryByText("created the organization")).toBeNull();
    expect(screen.getByText("The filters apply to the events loaded so far.")).toBeTruthy();

    await userEvent.click(button("Load more"));
    expect(await screen.findByText("created the organization")).toBeTruthy();
    expect(screen.getByText("changed the role of member@smithlaw.com")).toBeTruthy();
    expect(listActivity).toHaveBeenLastCalledWith("org_1", { before: 3 });
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(screen.getByText("That is the whole log.")).toBeTruthy();
  });

  it("keeps what it loaded and says why when a later page fails", async () => {
    signedIn([org()]);
    vi.mocked(listActivity)
      .mockResolvedValueOnce({ events: EVENTS.slice(0, 2), nextBefore: 3 })
      .mockRejectedValueOnce(new ApiError("network", "We could not reach the server."));
    inApp("/app/activity", <ActivityPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server.");
    expect(screen.getByText("changed the role of member@smithlaw.com")).toBeTruthy();
    expect(button("Load more").disabled).toBe(false);
  });

  it("shows an action the front has no words for under its own name", async () => {
    signedIn([org()]);
    vi.mocked(listActivity).mockResolvedValue({ events: [event({ id: "e9", action: "something.new" })], nextBefore: null });
    inApp("/app/activity", <ActivityPage />);
    expect(await screen.findByText("recorded “something.new”")).toBeTruthy();
    expect(button(/^Other/).textContent).toBe("Other1");
  });

  it("says so when there is nothing yet", async () => {
    signedIn([org()]);
    vi.mocked(listActivity).mockResolvedValue({ events: [], nextBefore: null });
    inApp("/app/activity", <ActivityPage />);
    expect(await screen.findByText("No activity yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("in mock with the switch on, mounts for a viewer and shows the back's 403", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn([org({ role: "viewer" })]);
    vi.mocked(listActivity).mockRejectedValue(new ApiError("forbidden", "Your role does not allow this"));
    inApp("/app/activity", <ActivityPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Your role does not allow this");
    expect(listActivity).toHaveBeenCalledExactlyOnceWith("org_1");
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it.each([undefined, "production"])("with the switch's key set and the mode %s, still never mounts for a member", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn([org({ role: "member" })]);
    inApp("/app/activity", <ActivityPage />);
    expect(await screen.findByRole("heading", { name: "Your role can't open this page" })).toBeTruthy();
    expect(listActivity).not.toHaveBeenCalled();
  });
});

describe("the platform admin page", () => {
  const monthly = { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" as const };
  const pending = {
    id: "del_1", orgId: "org_2", reason: "Closing the firm", status: "pending" as const,
    requestedAt: "2026-10-25T12:00:00.000Z", reviewedAt: null, reviewNote: null,
  };
  const ORGS = [
    { id: "org_1", name: "Smith Law", billingStatus: "active" as const, deleted: false, members: 2 },
    { id: "org_2", name: "Jones Legal", billingStatus: "pending_payment" as const, deleted: false, members: 1 },
  ];
  const DETAIL: AdminOrgDetailView = {
    id: "org_2", name: "Jones Legal", domain: "joneslegal.com", billingStatus: "pending_payment", deleted: false,
    createdAt: "2026-10-20T10:00:00.000Z", planCode: null, analysisCount: 1, pendingDeletion: pending,
    members: [{ email: "owner@joneslegal.com", role: "owner", joinedAt: "2026-10-20T10:00:00.000Z" }],
  };
  const audit = (overrides: Partial<AdminAuditEventView> & Pick<AdminAuditEventView, "id" | "action">): AdminAuditEventView => ({
    at: "2026-10-13T10:00:00.000Z", orgId: "org_1", orgName: "Smith Law", actorKind: "member", actorEmail: "owner@smithlaw.com",
    targetLabel: null, ...overrides,
  });
  const METRICS: AdminMetricsView = {
    organizations: { pending_payment: 1, active: 2, past_due: 0, canceled: 0, deleted: 3 },
    members: 4, analyses: 5, pendingDeletionRequests: 1, actions: { todo: 6, in_progress: 7, done: 8 },
  };

  /** An ARCA person: a platform admin who belongs to no organization. */
  const staff = () => signedIn([], true);
  const tab = (name: string) => screen.getByRole("tab", { name });
  const openTab = async (name: string) => userEvent.click(await screen.findByRole("tab", { name }));

  beforeEach(() => {
    vi.mocked(adminListPlans).mockResolvedValue([monthly]);
    vi.mocked(adminListDeletionRequests).mockResolvedValue([pending]);
    vi.mocked(adminListOrganizations).mockResolvedValue(ORGS);
    vi.mocked(adminGetOrganization).mockResolvedValue(DETAIL);
    vi.mocked(adminListAudit).mockResolvedValue({ events: [], nextBefore: null });
    vi.mocked(adminGetMetrics).mockResolvedValue(METRICS);
  });

  it.each<Role>(["owner", "admin", "member", "viewer"])(
    "shows Not available to an %s who is not a platform admin, and asks the admin API nothing",
    async role => {
      signedIn([org({ role })]);
      inApp("/app/admin", <AdminPage />);
      expect(await screen.findByText("Not available")).toBeTruthy();
      expect(screen.queryByRole("tab")).toBeNull();
      for (const call of [adminListPlans, adminListDeletionRequests, adminListOrganizations, adminListAudit, adminGetMetrics]) {
        expect(call).not.toHaveBeenCalled();
      }
    },
  );

  it.each<[string, () => void]>([
    ["without an organization", staff],
    ["who is also a viewer of an organization", () => signedIn([org({ role: "viewer" })], true)],
  ])("opens on Operations for a platform admin %s, as DN-10 left it", async (_who, sign) => {
    sign();
    inApp("/app/admin", <AdminPage />);
    expect(await screen.findByRole("heading", { name: "Platform admin (proof of concept)" })).toBeTruthy();
    expect(tab("Operations").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByLabelText<HTMLInputElement>("Price of Monthly (example price) in USD").value).toBe("499.00");
    expect(screen.getByText("Closing the firm")).toBeTruthy();
    expect(button("Approve the deletion of Jones Legal")).toBeTruthy();
    // The other tabs ask nothing until they are opened.
    expect(adminListAudit).not.toHaveBeenCalled();
    expect(adminGetMetrics).not.toHaveBeenCalled();
    expect(adminGetOrganization).not.toHaveBeenCalled();
  });

  it("lists the organizations and opens one in the same page, then goes back", async () => {
    staff();
    inApp("/app/admin", <AdminPage />);
    await openTab("Organizations");
    const list = await screen.findByRole("list", { name: "Organizations" });
    expect(within(list).getByText("Smith Law")).toBeTruthy();
    expect(within(list).getByText("Pending payment")).toBeTruthy();

    await userEvent.click(button("Open Jones Legal"));
    expect(await screen.findByRole("heading", { name: "Jones Legal" })).toBeTruthy();
    expect(adminGetOrganization).toHaveBeenCalledExactlyOnceWith("org_2");
    expect(screen.getByText("joneslegal.com")).toBeTruthy();
    expect(screen.getByText("No subscription")).toBeTruthy();
    expect(screen.getByText("Pending since Oct 25, 2026: Closing the firm")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Members" })).getByText("owner@joneslegal.com")).toBeTruthy();
    expect(navigation.router.push).not.toHaveBeenCalled();

    await userEvent.click(button("All organizations"));
    expect(await screen.findByRole("list", { name: "Organizations" })).toBeTruthy();
  });

  it("opens the audit of an organization from its detail", async () => {
    staff();
    inApp("/app/admin", <AdminPage />);
    await openTab("Organizations");
    await userEvent.click(await screen.findByRole("button", { name: "Open Jones Legal" }));
    await userEvent.click(await screen.findByRole("button", { name: "See its audit" }));
    expect(tab("Audit").getAttribute("aria-selected")).toBe("true");
    expect(select("Organization").value).toBe("org_2");
    await waitFor(() => expect(adminListAudit).toHaveBeenCalledExactlyOnceWith({ orgId: "org_2" }));
  });

  it("reads the audit of every organization, names ARCA staff, narrows to one and loads more", async () => {
    staff();
    vi.mocked(adminListAudit)
      .mockResolvedValueOnce({
        events: [
          audit({
            id: "a2", action: "plan.updated", orgId: null, orgName: null, actorKind: "platform", actorEmail: "ops@arca.example",
            targetLabel: "monthly",
          }),
          audit({ id: "a1", action: "billing.event_applied", actorKind: "system", actorEmail: null }),
        ],
        nextBefore: null,
      })
      .mockResolvedValueOnce({
        events: [audit({ id: "a4", action: "member.removed", targetLabel: "member@smithlaw.com" })],
        nextBefore: 7,
      })
      .mockResolvedValueOnce({ events: [audit({ id: "a3", action: "org.created" })], nextBefore: null });
    inApp("/app/admin", <AdminPage />);
    await openTab("Audit");

    const events = await screen.findByRole("list", { name: "Audit events" });
    expect(adminListAudit).toHaveBeenLastCalledWith({});
    expect(within(events).getByText("ops@arca.example")).toBeTruthy();
    expect(within(events).getByText("changed the plan monthly")).toBeTruthy();
    expect(within(events).getByText("Platform")).toBeTruthy();
    expect(within(events).getAllByText("System")).toHaveLength(2);

    await userEvent.selectOptions(select("Organization"), "org_1");
    expect(await screen.findByText("removed member@smithlaw.com")).toBeTruthy();
    expect(adminListAudit).toHaveBeenLastCalledWith({ orgId: "org_1" });
    expect(screen.queryByText("ops@arca.example")).toBeNull();

    await userEvent.click(button("Load more"));
    expect(await screen.findByText("created the organization")).toBeTruthy();
    expect(adminListAudit).toHaveBeenLastCalledWith({ orgId: "org_1", before: 7 });
    expect(screen.getByText("removed member@smithlaw.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows the counts, and only counts", async () => {
    staff();
    inApp("/app/admin", <AdminPage />);
    await openTab("Metrics");
    const value = (group: string, label: string) =>
      within(screen.getByRole("region", { name: group })).getByText(label).nextElementSibling?.textContent;
    await screen.findByRole("region", { name: "Organizations" });
    expect(value("Organizations", "Active")).toBe("2");
    expect(value("Organizations", "Deleted")).toBe("3");
    expect(value("Usage", "Members")).toBe("4");
    expect(value("Usage", "Analyses")).toBe("5");
    expect(value("Usage", "Pending deletion requests")).toBe("1");
    expect(value("Actions", "In progress")).toBe("7");
    expect(screen.getByRole("tabpanel").textContent).not.toMatch(/\$/);
  });

  it("shows the API's reason when a tab cannot load", async () => {
    staff();
    vi.mocked(adminGetMetrics).mockRejectedValue(new ApiError("forbidden", "Platform admin access required"));
    inApp("/app/admin", <AdminPage />);
    await openTab("Metrics");
    expect((await screen.findByRole("alert")).textContent).toContain("Platform admin access required");
  });
});
