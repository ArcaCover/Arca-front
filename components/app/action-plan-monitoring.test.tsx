// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionItemView, ActionPlanResponse, MeResponse, MemberView, OrgView, Role } from "@arca/contracts";

import ActionPlanPage from "@/app/app/action-plan/page";
import AppLayout from "@/app/app/layout";
import MonitoringPage from "@/app/app/monitoring/page";
import { ApiError } from "@/lib/api/client";
import {
  createAction, deleteAction, getActionPlan, getMe, listAnalyses, listMembers, updateAction,
} from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

// DN-11 §6.2 and §6.4: the action plan on the real API, by role, and Monitoring's alerts (still sample data) turning
// into real actions for the roles that assign them. The back is the one that denies, so its 403 and 429 are shown.

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

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  const me: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
  vi.mocked(getMe).mockResolvedValue(me);
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const POLICY: ActionItemView = {
  key: "a.sc_demo.improve:D1.1", source: "assessment", title: "Document the policy", detail: "Create a written policy.",
  domain: "governance", pointsGain: 5, status: "todo", assignee: null, dueDate: null, updatedAt: null,
};
const INCIDENT: ActionItemView = {
  key: "c.00000000-0000-4000-8000-000000000001", source: "custom", title: "Name an incident lead", detail: null,
  domain: "incident_preparedness", pointsGain: null, status: "in_progress",
  assignee: { userId: "u_member", email: "member@smithlaw.com" }, dueDate: "2026-12-01",
  updatedAt: "2026-11-01T10:00:00.000Z",
};
const PLAN: ActionPlanResponse = {
  source: { scanId: "sc_demo", domain: "smithlaw.com", claimedAt: "2026-10-25T10:00:00.000Z" },
  items: [POLICY, INCIDENT],
};
const plan = (...items: ActionItemView[]): ActionPlanResponse => ({ ...PLAN, items });

const member = (userId: string, role: Role): MemberView => ({
  userId, email: `${userId.slice(2)}@smithlaw.com`, role, joinedAt: "2026-10-25T10:00:00.000Z",
});
const MEMBERS: MemberView[] = [
  { ...member("u_me", "owner"), email: "me@smithlaw.com" },
  member("u_admin", "admin"),
  member("u_member", "member"),
  member("u_viewer", "viewer"),
];

const FORBIDDEN = new ApiError("forbidden", "Your role does not allow this");
const RATE_LIMITED = new ApiError("rate_limited", "Too many changes to the action plan; try again in a minute", 60);

const list = (name: string) => screen.findByRole("list", { name });
const status = (title: string) => screen.queryByRole<HTMLSelectElement>("combobox", { name: `Status for “${title}”` });
const assigneeSelect = (title: string) => screen.queryByRole<HTMLSelectElement>("combobox", { name: `Assignee for “${title}”` });
const dueDate = (title: string) => screen.queryByLabelText<HTMLInputElement>(`Due date for “${title}”`);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(listMembers).mockResolvedValue({ members: MEMBERS, invitations: [] });
  vi.mocked(getActionPlan).mockResolvedValue(PLAN);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("the action plan by role", () => {
  it.each<Role>(["owner", "admin"])("gives an %s every control, and says marking an action leaves the score alone", async role => {
    signedIn(org({ role }));
    inApp("/app/action-plan", <ActionPlanPage />);

    expect(within(await list("Actions to do")).getByText("Document the policy")).toBeTruthy();
    expect(within(await list("Actions in progress")).getByText("Name an incident lead")).toBeTruthy();
    expect(screen.getByText(/A new analysis updates the score\./)).toBeTruthy();
    expect(screen.getByText("From your assessment")).toBeTruthy();
    expect(screen.getByText("Added by your team")).toBeTruthy();
    expect(screen.getByText("+5 demo pts")).toBeTruthy();
    expect(screen.queryByText("Sample data")).toBeNull();

    expect(status("Document the policy")).toBeTruthy();
    expect(assigneeSelect("Document the policy")).toBeTruthy();
    expect(dueDate("Document the policy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add an action" })).toBeTruthy();
    // Only the organization's own actions can be deleted (D13).
    expect(screen.getByRole("button", { name: "Delete “Name an incident lead”" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete “Document the policy”" })).toBeNull();
    expect(screen.queryByText(/Ask an owner/)).toBeNull();
    expect(getActionPlan).toHaveBeenCalledExactlyOnceWith("org_1");
    expect(listMembers).toHaveBeenCalledExactlyOnceWith("org_1");
  });

  it("lets a member change the status, and nothing else", async () => {
    signedIn(org({ role: "member" }));
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    expect(status("Document the policy")).toBeTruthy();
    expect(status("Name an incident lead")).toBeTruthy();
    expect(assigneeSelect("Document the policy")).toBeNull();
    expect(dueDate("Name an incident lead")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an action" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
    expect(screen.getByText("Assigned to member@smithlaw.com")).toBeTruthy();
    expect(screen.getByText("Due Dec 1, 2026")).toBeTruthy();
    expect(
      screen.getByText("You can change the status of any action. Ask an owner or admin to assign one, set a due date or add an action."),
    ).toBeTruthy();
    expect(listMembers).not.toHaveBeenCalled();
  });

  it("shows a viewer the plan read-only, with who can change it said once", async () => {
    signedIn(org({ role: "viewer" }));
    inApp("/app/action-plan", <ActionPlanPage />);

    expect(within(await list("Actions to do")).getByText("Document the policy")).toBeTruthy();
    expect(screen.queryAllByRole("combobox", { name: /^(Status|Assignee) for/ })).toEqual([]);
    expect(dueDate("Name an incident lead")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an action" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
    expect(screen.getAllByText("Your role can read the plan. Ask an owner, admin or member to update an action.")).toHaveLength(1);
    expect(screen.getByText(/A new analysis updates the score\./)).toBeTruthy();
    expect(listMembers).not.toHaveBeenCalled();
  });

  it("moves an action when its status changes, and reads the plan again", async () => {
    signedIn(org({ role: "member" }));
    const done = { ...POLICY, status: "done" as const, updatedAt: "2026-11-05T10:00:00.000Z" };
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(done, INCIDENT));
    vi.mocked(updateAction).mockResolvedValue(done);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "done");
    expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", POLICY.key, { status: "done" });
    expect(within(await list("Actions done")).getByText("Document the policy")).toBeTruthy();
    await waitFor(() => expect(getActionPlan).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Nothing here with these filters.")).toBeTruthy();
  });

  it("assigns only to members who can mark actions, and clears an assignee", async () => {
    signedIn(org());
    const assigned = { ...POLICY, assignee: { userId: "u_admin", email: "admin@smithlaw.com" } };
    vi.mocked(updateAction).mockResolvedValueOnce(assigned).mockResolvedValueOnce({ ...INCIDENT, assignee: null });
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    const select = assigneeSelect("Document the policy")!;
    await waitFor(() => expect(select.disabled).toBe(false));
    expect(within(select).getAllByRole("option").map(option => option.textContent)).toEqual([
      "Unassigned", "me@smithlaw.com (you)", "admin@smithlaw.com", "member@smithlaw.com",
    ]);

    await user.selectOptions(select, "u_admin");
    expect(updateAction).toHaveBeenLastCalledWith("org_1", POLICY.key, { assigneeUserId: "u_admin" });
    await waitFor(() => expect(assigneeSelect("Document the policy")!.value).toBe("u_admin"));

    await user.selectOptions(assigneeSelect("Name an incident lead")!, "Unassigned");
    expect(updateAction).toHaveBeenLastCalledWith("org_1", INCIDENT.key, { assigneeUserId: null });
  });

  it("saves a due date when the field is left, and clears one", async () => {
    signedIn(org({ role: "admin" }));
    vi.mocked(updateAction)
      .mockResolvedValueOnce({ ...POLICY, dueDate: "2026-12-15" })
      .mockResolvedValueOnce({ ...INCIDENT, dueDate: null });
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const field = dueDate("Document the policy")!;
    fireEvent.change(field, { target: { value: "2026-12-15" } });
    expect(updateAction).not.toHaveBeenCalled();
    fireEvent.blur(field);
    await waitFor(() => expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", POLICY.key, { dueDate: "2026-12-15" }));

    const other = dueDate("Name an incident lead")!;
    expect(other.value).toBe("2026-12-01");
    fireEvent.change(other, { target: { value: "" } });
    fireEvent.blur(other);
    await waitFor(() => expect(updateAction).toHaveBeenLastCalledWith("org_1", INCIDENT.key, { dueDate: null }));
  });

  it("puts the saved date back when the back refuses it", async () => {
    signedIn(org());
    vi.mocked(updateAction).mockRejectedValue(RATE_LIMITED);
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const field = dueDate("Name an incident lead")!;
    fireEvent.change(field, { target: { value: "2027-01-10" } });
    fireEvent.blur(field);
    expect((await screen.findByRole("alert")).textContent).toBe(RATE_LIMITED.message);
    await waitFor(() => expect(dueDate("Name an incident lead")!.value).toBe("2026-12-01"));
  });

  it("adds one of the organization's own actions", async () => {
    signedIn(org());
    const created: ActionItemView = {
      key: "c.00000000-0000-4000-8000-000000000002", source: "custom", title: "Write a disclosure clause",
      detail: "For the engagement letter.", domain: "training", pointsGain: null, status: "todo", assignee: null,
      dueDate: null, updatedAt: "2026-11-05T10:00:00.000Z",
    };
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(POLICY, INCIDENT, created));
    vi.mocked(createAction).mockResolvedValue(created);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add an action" }));
    const dialog = screen.getByRole("dialog", { name: "Add an action" });
    await user.type(within(dialog).getByRole("textbox", { name: "Title" }), "  Write a disclosure clause ");
    await user.type(within(dialog).getByRole("textbox", { name: /Details/ }), "For the engagement letter.");
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "Domain" }), "training");
    await user.click(within(dialog).getByRole("button", { name: "Add action" }));

    expect(createAction).toHaveBeenCalledExactlyOnceWith("org_1", {
      title: "Write a disclosure clause", detail: "For the engagement letter.", domain: "training",
    });
    expect(await screen.findByText("Action added to the plan.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(await list("Actions to do")).getByText("Write a disclosure clause")).toBeTruthy();
    await waitFor(() => expect(getActionPlan).toHaveBeenCalledTimes(2));
  });

  it("sends only a title when the rest is left empty", async () => {
    signedIn(org());
    vi.mocked(createAction).mockResolvedValue({ ...INCIDENT, key: "c.00000000-0000-4000-8000-000000000003", title: "Pick a vendor" });
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add an action" }));
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Pick a vendor");
    await user.click(screen.getByRole("button", { name: "Add action" }));
    expect(createAction).toHaveBeenCalledExactlyOnceWith("org_1", { title: "Pick a vendor" });
  });

  it("deletes one of the organization's own actions after asking", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(POLICY));
    vi.mocked(deleteAction).mockResolvedValue(undefined);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete “Name an incident lead”" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this action?" });
    expect(deleteAction).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete action" }));

    expect(deleteAction).toHaveBeenCalledExactlyOnceWith("org_1", INCIDENT.key);
    expect(await screen.findByText("Action deleted.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Name an incident lead")).toBeNull();
  });

  it("says the back's 429 and leaves the action where it was", async () => {
    signedIn(org());
    vi.mocked(updateAction).mockRejectedValue(RATE_LIMITED);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "in_progress");
    expect((await screen.findByRole("alert")).textContent).toBe("Too many changes to the action plan; try again in a minute");
    expect(within(await list("Actions to do")).getByText("Document the policy")).toBeTruthy();
    expect(status("Document the policy")!.value).toBe("todo");
  });

  it("says inside the dialog why a delete was refused", async () => {
    signedIn(org());
    vi.mocked(deleteAction).mockRejectedValue(FORBIDDEN);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Delete “Name an incident lead”" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this action?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete action" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Your role does not allow this");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  describe("with the debug switch", () => {
    it("in mock, gives a viewer every control, and shows the back's 403", async () => {
      vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
      sessionStorage.setItem(SWITCH_KEY, "1");
      signedIn(org({ role: "viewer" }));
      vi.mocked(updateAction).mockRejectedValue(FORBIDDEN);
      inApp("/app/action-plan", <ActionPlanPage />);
      const user = userEvent.setup();

      await list("Actions to do");
      expect(screen.getByRole("button", { name: "Add an action" })).toBeTruthy();
      expect(assigneeSelect("Document the policy")).toBeTruthy();
      expect(screen.queryByText(/Your role can read the plan/)).toBeNull();
      await user.selectOptions(status("Document the policy")!, "done");
      expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", POLICY.key, { status: "done" });
      expect((await screen.findByRole("alert")).textContent).toBe("Your role does not allow this");
      expect(within(await list("Actions to do")).getByText("Document the policy")).toBeTruthy();
    });

    it("in mock, shows a member the back's 403 inside the add form", async () => {
      vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
      sessionStorage.setItem(SWITCH_KEY, "1");
      signedIn(org({ role: "member" }));
      vi.mocked(createAction).mockRejectedValue(FORBIDDEN);
      inApp("/app/action-plan", <ActionPlanPage />);
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "Add an action" }));
      const dialog = screen.getByRole("dialog", { name: "Add an action" });
      await user.type(within(dialog).getByRole("textbox", { name: "Title" }), "Write a disclosure clause");
      await user.click(within(dialog).getByRole("button", { name: "Add action" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe("Your role does not allow this");
      expect(screen.getByRole("dialog", { name: "Add an action" })).toBeTruthy();
    });

    it.each([undefined, "production", "live-debug"])("with the mode %s, keeps a viewer's plan read-only", async mode => {
      vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
      sessionStorage.setItem(SWITCH_KEY, "1");
      signedIn(org({ role: "viewer" }));
      inApp("/app/action-plan", <ActionPlanPage />);

      await list("Actions to do");
      expect(status("Document the policy")).toBeNull();
      expect(screen.queryByRole("button", { name: "Add an action" })).toBeNull();
      expect(screen.getByText("Your role can read the plan. Ask an owner, admin or member to update an action.")).toBeTruthy();
    });
  });

  it("says when the plan cannot be read, and tries again", async () => {
    signedIn(org());
    vi.mocked(getActionPlan)
      .mockRejectedValueOnce(new ApiError("internal_error", "The scan service failed."))
      .mockResolvedValue(PLAN);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    expect((await screen.findByRole("alert")).textContent).toBe("The scan service failed.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(within(await list("Actions to do")).getByText("Document the policy")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("goes to billing when the back answers 402", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockRejectedValue(new ApiError("payment_required", "This organization has no active subscription"));
    inApp("/app/action-plan", <ActionPlanPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/app/billing"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("lists only the organization's own actions when no analysis has an assessment", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [INCIDENT] });
    inApp("/app/action-plan", <ActionPlanPage />);
    expect(await screen.findByText(/No analysis with a completed assessment yet/)).toBeTruthy();
    expect(within(await list("Actions in progress")).getByText("Name an incident lead")).toBeTruthy();
  });

  it("filters by domain and by assignee", async () => {
    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by domain" }), "Incident Preparedness");
    expect(screen.queryByText("Document the policy")).toBeNull();
    expect(screen.getByText("Name an incident lead")).toBeTruthy();

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by domain" }), "All domains");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by assignee" }), "Unassigned");
    expect(screen.getByText("Document the policy")).toBeTruthy();
    expect(screen.queryByText("Name an incident lead")).toBeNull();
  });

  it("locks the page for an organization that has not paid, and asks the API nothing", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/action-plan", <ActionPlanPage />);
    expect(await screen.findByRole("heading", { name: "Choose a plan to unlock the action plan" })).toBeTruthy();
    expect(getActionPlan).not.toHaveBeenCalled();
    expect(listMembers).not.toHaveBeenCalled();
  });
});

describe("monitoring by role", () => {
  const GUIDANCE = /A state bar published new guidance/;
  const SUGGESTED = "Add a citation check to your filing checklist.";

  it("turns an alert into a real action from its suggestion, and then says it is in the plan", async () => {
    signedIn(org());
    const created: ActionItemView = {
      key: "c.00000000-0000-4000-8000-000000000004", source: "custom", title: SUGGESTED, detail: null, domain: null,
      pointsGain: null, status: "todo", assignee: null, dueDate: null, updatedAt: "2026-11-05T10:00:00.000Z",
    };
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(POLICY, INCIDENT, created));
    vi.mocked(createAction).mockResolvedValue(created);
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: GUIDANCE }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create action" }));
    const form = screen.getByRole("dialog", { name: "Add an action" });
    expect(within(form).getByText(/comes from a sample alert/)).toBeTruthy();
    expect(within(form).getByRole<HTMLInputElement>("textbox", { name: "Title" }).value).toBe(SUGGESTED);
    expect(createAction).not.toHaveBeenCalled();
    await user.click(within(form).getByRole("button", { name: "Add action" }));

    expect(createAction).toHaveBeenCalledExactlyOnceWith("org_1", { title: SUGGESTED });
    expect(await screen.findByText("Action added to the plan.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(getActionPlan).toHaveBeenCalledTimes(2));
    const row = await screen.findByRole("button", { name: GUIDANCE });
    expect(row.textContent).not.toContain("(unread)");
    expect(await within(row).findByText("In the action plan")).toBeTruthy();

    await user.click(row);
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("link", { name: "Already in the action plan" }).getAttribute("href")).toBe("/app/action-plan");
    expect(within(drawer).queryByRole("button", { name: "Create action" })).toBeNull();
  });

  it("knows from the real plan which suggestions are already in it", async () => {
    signedIn(org({ role: "viewer" }));
    vi.mocked(getActionPlan).mockResolvedValue(
      plan(POLICY, { ...INCIDENT, key: "c.00000000-0000-4000-8000-000000000005", title: "  add a citation check to your filing checklist." }),
    );
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    const row = await screen.findByRole("button", { name: GUIDANCE });
    expect(await within(row).findByText("In the action plan")).toBeTruthy();
    await user.click(row);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "Already in the action plan" })).toBeTruthy();
  });

  it.each<Role>(["member", "viewer"])("lets a %s read and mark alerts as read, and nothing more", async role => {
    signedIn(org({ role }));
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    expect(
      await screen.findByText("You can read every alert and mark it as read. Ask an owner or admin to turn one into an action or dismiss it."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Run re-scan now" })).toBeNull();

    await user.click(screen.getByRole("button", { name: GUIDANCE }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).queryByRole("button", { name: "Create action" })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Dismiss" })).toBeNull();
    await user.click(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Mark as read" }));
    expect(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Mark as read" }).disabled).toBe(true);
    await user.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: GUIDANCE }).textContent).not.toContain("(unread)");

    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByText("Everything is read.")).toBeTruthy();
    expect(createAction).not.toHaveBeenCalled();
  });

  it.each<Role>(["owner", "admin"])("lets an %s dismiss an alert and run the re-scan preview", async role => {
    signedIn(org({ role }));
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    expect(await screen.findByRole("button", { name: "Run re-scan now" })).toBeTruthy();
    expect(screen.queryByText(/Ask an owner or admin/)).toBeNull();
    const title = /Your website no longer links to an AI policy/;
    await user.click(screen.getByRole("button", { name: title }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: title })).toBeNull();
  });

  it("in mock with the switch on, gives a member Create action, and shows the back's 403 in the form", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "member" }));
    vi.mocked(createAction).mockRejectedValue(FORBIDDEN);
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: GUIDANCE }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Dismiss" })).toBeTruthy();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create action" }));
    const form = screen.getByRole("dialog", { name: "Add an action" });
    await user.click(within(form).getByRole("button", { name: "Add action" }));
    expect((await within(form).findByRole("alert")).textContent).toBe("Your role does not allow this");
    expect(screen.getByRole("button", { name: GUIDANCE }).textContent).toContain("(unread)");
  });
});
