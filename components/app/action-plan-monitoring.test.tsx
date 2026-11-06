// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

/** A promise the test settles itself, to hold a request on its way. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const list = (name: string) => screen.findByRole("list", { name });
const status = (title: string) => screen.queryByRole<HTMLSelectElement>("combobox", { name: `Status for “${title}”` });
const assigneeSelect = (title: string) => screen.queryByRole<HTMLSelectElement>("combobox", { name: `Assignee for “${title}”` });
const dueDate = (title: string) => screen.queryByLabelText<HTMLInputElement>(`Due date for “${title}”`);
const h1s = () => screen.getAllByRole("heading", { level: 1 }).map(heading => heading.textContent);
/** Finds the text inside the toast's live region, which a screen reader speaks, not only somewhere on the page. */
const spoken = async (text: string) => within(await screen.findByRole("status")).findByText(text);

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

  it("says who can change the plan in the read-only notice, above the note about the score", async () => {
    signedIn(org({ role: "viewer" }));
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const notice = screen.getByText("Your role can read the plan. Ask an owner, admin or member to update an action.");
    // The notice primitive: a box with an icon, not a grey line under the D16 box.
    expect(notice.querySelector("svg")).toBeTruthy();
    const score = screen.getByText(/A new analysis updates the score\./);
    expect(notice.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adds up the open actions' demo points as separate estimates, without crediting the total to the model", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockResolvedValue(
      plan(POLICY, { ...POLICY, key: "a.sc_demo.improve:D2.1", title: "Approve the tools", pointsGain: 3.2 }, {
        ...POLICY, key: "a.sc_demo.improve:D3.1", title: "Review the drafts", pointsGain: 4, status: "done",
      }),
    );
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const card = screen.getByText("Demo points still open").parentElement!;
    expect(card.textContent).toContain("+8.2");
    expect(within(card).getByText("Each open action's own demo estimate, added up. They were not estimated together.")).toBeTruthy();
    expect(screen.queryByText(/Estimated by the assessment's demo model/)).toBeNull();
  });

  it("gives the status alone a narrow column, and the four controls a wide one", async () => {
    signedIn(org({ role: "member" }));
    const memberView = inApp("/app/action-plan", <ActionPlanPage />);
    await list("Actions to do");
    const narrow = status("Document the policy")!.closest("div")!;
    expect(narrow.className).toContain("md:w-44");
    expect(narrow.className).not.toContain("md:w-[26rem]");
    memberView.unmount();

    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);
    await list("Actions to do");
    expect(status("Document the policy")!.closest("div")!.className).toContain("md:w-[26rem]");
  });

  it("waits on each row's own write: the other rows stay usable, and the row's Delete waits too", async () => {
    signedIn(org());
    const policy = deferred<ActionItemView>();
    const incident = deferred<ActionItemView>();
    vi.mocked(updateAction).mockImplementation((_org, key) => (key === POLICY.key ? policy.promise : incident.promise));
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();
    const deleteIncident = () => screen.getByRole<HTMLButtonElement>("button", { name: "Delete “Name an incident lead”" });

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "in_progress");
    // Inert rather than disabled while it is sent, so the focus stays on it.
    expect(status("Document the policy")!.getAttribute("aria-disabled")).toBe("true");
    expect(status("Document the policy")!.disabled).toBe(false);
    expect(document.activeElement).toBe(status("Document the policy"));
    expect(status("Name an incident lead")!.getAttribute("aria-disabled")).toBeNull();
    expect(deleteIncident().disabled).toBe(false);
    // A second change while the first is on its way is not sent.
    await user.selectOptions(status("Document the policy")!, "done");
    expect(updateAction).toHaveBeenCalledTimes(1);

    await user.selectOptions(status("Name an incident lead")!, "done");
    expect(updateAction).toHaveBeenCalledTimes(2);
    expect(deleteIncident().disabled).toBe(true);

    // The first write landing frees its own row only.
    policy.resolve({ ...POLICY, status: "in_progress" });
    await waitFor(() => expect(status("Document the policy")!.getAttribute("aria-disabled")).toBeNull());
    expect(status("Name an incident lead")!.getAttribute("aria-disabled")).toBe("true");
    expect(deleteIncident().disabled).toBe(true);

    incident.resolve({ ...INCIDENT, status: "done" });
    await waitFor(() => expect(deleteIncident().disabled).toBe(false));
  });

  it("keeps a row's assignee inert, not disabled, while its write is on its way, and sends no second change", async () => {
    signedIn(org());
    const assigned = { ...POLICY, assignee: { userId: "u_admin", email: "admin@smithlaw.com" } };
    const write = deferred<ActionItemView>();
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(assigned, INCIDENT));
    vi.mocked(updateAction).mockReturnValue(write.promise);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await waitFor(() => expect(assigneeSelect("Document the policy")!.disabled).toBe(false));
    await user.selectOptions(assigneeSelect("Document the policy")!, "u_admin");
    expect(updateAction).toHaveBeenCalledExactlyOnceWith("org_1", POLICY.key, { assigneeUserId: "u_admin" });
    const select = assigneeSelect("Document the policy")!;
    expect(select.getAttribute("aria-disabled")).toBe("true");
    expect(select.disabled).toBe(false);
    expect(document.activeElement).toBe(select);
    expect(assigneeSelect("Name an incident lead")!.getAttribute("aria-disabled")).toBeNull();

    // Each change sent is an audited write, so one made while the first is on its way is dropped, and the select shows
    // the saved assignee again.
    await user.selectOptions(select, "u_member");
    expect(updateAction).toHaveBeenCalledTimes(1);
    expect(select.value).toBe("__unassigned");

    write.resolve(assigned);
    await waitFor(() => expect(assigneeSelect("Document the policy")!.getAttribute("aria-disabled")).toBeNull());
    expect(assigneeSelect("Document the policy")!.value).toBe("u_admin");
    expect(updateAction).toHaveBeenCalledTimes(1);
  });

  it("shows a write that lands after the plan was read again while it was on its way", async () => {
    signedIn(org());
    const started = { ...POLICY, status: "in_progress" as const };
    const incident = deferred<ActionItemView>();
    vi.mocked(getActionPlan)
      .mockResolvedValueOnce(PLAN)
      .mockResolvedValueOnce(plan(started, INCIDENT))
      // The read after the last write never lands here, so only the page's own record of that write can show it.
      .mockReturnValue(new Promise(() => {}));
    vi.mocked(updateAction).mockImplementation(async (_org, key) => (key === POLICY.key ? started : incident.promise));
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Name an incident lead")!, "done");
    await user.selectOptions(status("Document the policy")!, "in_progress");
    await waitFor(() => expect(getActionPlan).toHaveBeenCalledTimes(2));
    expect(within(await list("Actions in progress")).getByText("Document the policy")).toBeTruthy();

    incident.resolve({ ...INCIDENT, status: "done" });
    expect(within(await list("Actions done")).getByText("Name an incident lead")).toBeTruthy();
    expect(within(await list("Actions in progress")).getByText("Document the policy")).toBeTruthy();
  });

  it("reads the plan again when the back no longer has the action (D14)", async () => {
    signedIn(org({ role: "member" }));
    const replaced = { ...POLICY, key: "a.sc_new.improve:D1.1", title: "Name a policy owner" };
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(replaced));
    vi.mocked(updateAction).mockRejectedValue(new ApiError("not_found", "Action not found"));
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "done");
    expect((await screen.findByRole("alert")).textContent).toBe("Action not found");
    expect(await within(await list("Actions to do")).findByText("Name a policy owner")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Document the policy")).toBeNull());
    expect(getActionPlan).toHaveBeenCalledTimes(2);
  });

  it("keeps the plan on screen when the read after a write fails, and says it may be out of date", async () => {
    signedIn(org({ role: "member" }));
    const done = { ...POLICY, status: "done" as const };
    vi.mocked(getActionPlan)
      .mockResolvedValueOnce(PLAN)
      .mockRejectedValueOnce(new ApiError("internal_error", "The scan service failed."))
      .mockResolvedValue(plan(done, INCIDENT));
    vi.mocked(updateAction).mockResolvedValue(done);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "done");
    expect((await screen.findByRole("alert")).textContent).toBe("The scan service failed. The plan shown may be out of date.");
    expect(within(await list("Actions done")).getByText("Document the policy")).toBeTruthy();
    expect(within(await list("Actions in progress")).getByText("Name an incident lead")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(within(await list("Actions done")).getByText("Document the policy")).toBeTruthy();
    expect(getActionPlan).toHaveBeenCalledTimes(3);
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

  it("keeps the focus on an action's status as it moves to another list, and says where it went", async () => {
    signedIn(org({ role: "member" }));
    const started = { ...POLICY, status: "in_progress" as const };
    const read = deferred<ActionPlanResponse>();
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockReturnValue(read.promise);
    vi.mocked(updateAction).mockResolvedValue(started);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    const before = status("Document the policy")!;
    await user.selectOptions(before, "in_progress");
    expect(await spoken("“Document the policy” moved to In progress.")).toBeTruthy();
    const moved = within(await list("Actions in progress")).getByRole("combobox", { name: "Status for “Document the policy”" });
    // The row was mounted anew in its new list, and the focus went with it instead of dropping to the page.
    expect(before.isConnected).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(moved));

    // The plan read after the write lands (its new date shows), and the focus stays put.
    expect(getActionPlan).toHaveBeenCalledTimes(2);
    read.resolve(plan({ ...started, updatedAt: "2026-11-05T10:00:00.000Z" }, INCIDENT));
    expect(await screen.findByText("Updated Nov 5, 2026")).toBeTruthy();
    expect(status("Document the policy")).toBe(moved);
    expect(document.activeElement).toBe(moved);
  });

  it("leaves the focus where the user took it while the status change was on its way", async () => {
    signedIn(org({ role: "member" }));
    const started = { ...POLICY, status: "in_progress" as const };
    const write = deferred<ActionItemView>();
    vi.mocked(getActionPlan).mockResolvedValueOnce(PLAN).mockResolvedValue(plan(started, INCIDENT));
    vi.mocked(updateAction).mockReturnValue(write.promise);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await list("Actions to do");
    await user.selectOptions(status("Document the policy")!, "in_progress");
    const filter = screen.getByRole("combobox", { name: "Filter by domain" });
    filter.focus();
    write.resolve(started);
    expect(await spoken("“Document the policy” moved to In progress.")).toBeTruthy();
    expect(within(await list("Actions in progress")).getByText("Document the policy")).toBeTruthy();
    expect(document.activeElement).toBe(filter);
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

  it("keeps the saved date when the field is left half edited", async () => {
    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const field = dueDate("Name an incident lead")!;
    // A browser reports "" for a date with one part cleared, and says so through badInput, which jsdom does not model.
    Object.defineProperty(field, "validity", { configurable: true, value: { badInput: true } });
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    await waitFor(() => expect(dueDate("Name an incident lead")!.value).toBe("2026-12-01"));
    expect(updateAction).not.toHaveBeenCalled();
  });

  it("empties a field with no saved date when it is left half edited", async () => {
    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);

    await list("Actions to do");
    const field = dueDate("Document the policy")!;
    expect(field.value).toBe("");
    // The value was "" and stays "", so only a new field drops the half-typed parts the browser still shows.
    Object.defineProperty(field, "validity", { configurable: true, value: { badInput: true } });
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    await waitFor(() => expect(dueDate("Document the policy")!.validity.badInput).toBe(false));
    expect(dueDate("Document the policy")!.value).toBe("");
    expect(updateAction).not.toHaveBeenCalled();
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
    // The lock takes the page's content, not its title.
    expect(h1s()).toEqual(["Action plan"]);
    expect(screen.queryByRole("button", { name: "Add an action" })).toBeNull();
    expect(getActionPlan).not.toHaveBeenCalled();
    expect(listMembers).not.toHaveBeenCalled();
  });

  it("tells a role that cannot choose a plan that the owner unlocks the page", async () => {
    signedIn(org({ role: "member", billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/action-plan", <ActionPlanPage />);
    expect(await screen.findByRole("heading", { name: "Only the owner can unlock the action plan" })).toBeTruthy();
    expect(h1s()).toEqual(["Action plan"]);
    expect(screen.queryByRole("link", { name: "See plans" })).toBeNull();
    expect(getActionPlan).not.toHaveBeenCalled();
  });

  it("keeps one title over the plan once it is unlocked", async () => {
    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);
    await list("Actions to do");
    expect(h1s()).toEqual(["Action plan"]);
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

  it("offers Create action only once the plan is read, so it cannot add an action the plan already has", async () => {
    signedIn(org());
    const read = deferred<ActionPlanResponse>();
    vi.mocked(getActionPlan).mockReturnValue(read.promise);
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: GUIDANCE }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Create action" }).disabled).toBe(true);
    expect(within(drawer).getByText("Loading the action plan…")).toBeTruthy();

    read.resolve(PLAN);
    await waitFor(() => expect(within(drawer).getByRole<HTMLButtonElement>("button", { name: "Create action" }).disabled).toBe(false));
    expect(within(drawer).queryByText("Loading the action plan…")).toBeNull();
  });

  it("says why Create action waits when the plan could not be read, and reads it again from the drawer", async () => {
    signedIn(org());
    vi.mocked(getActionPlan).mockRejectedValueOnce(new ApiError("internal_error", "The scan service failed.")).mockResolvedValue(PLAN);
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();
    const create = () => within(screen.getByRole("dialog")).getByRole<HTMLButtonElement>("button", { name: "Create action" });

    await waitFor(() => expect(getActionPlan).toHaveBeenCalled());
    await user.click(await screen.findByRole("button", { name: GUIDANCE }));
    const drawer = screen.getByRole("dialog");
    expect((await within(drawer).findByRole("alert")).textContent).toBe(
      "The action plan could not be loaded, so this alert cannot become an action yet.",
    );
    expect(create().disabled).toBe(true);
    expect(createAction).not.toHaveBeenCalled();

    await user.click(within(drawer).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(create().disabled).toBe(false));
    expect(within(drawer).queryByRole("alert")).toBeNull();
    expect(getActionPlan).toHaveBeenCalledTimes(2);
    // Try again left with the failure; the focus went on to what the plan unblocked, not to the page under the drawer.
    expect(document.activeElement).toBe(create());
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

    const notice = await screen.findByText(
      "You can read every alert and mark it as read. Ask an owner or admin to turn one into an action or dismiss it.",
    );
    // The read-only notice primitive, with its icon.
    expect(notice.querySelector("svg")).toBeTruthy();
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

  it.each<[Role, string]>([
    ["owner", "Choose a plan to unlock monitoring"],
    ["member", "Only the owner can unlock monitoring"],
  ])("keeps the page's title over the lock for an unpaid organization's %s", async (role, lock) => {
    signedIn(org({ role, billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/monitoring", <MonitoringPage />);
    expect(await screen.findByRole("heading", { name: lock })).toBeTruthy();
    expect(h1s()).toEqual(["Monitoring"]);
    expect(getActionPlan).not.toHaveBeenCalled();
  });

  it("keeps one title over the alerts once the page is unlocked", async () => {
    signedIn(org());
    inApp("/app/monitoring", <MonitoringPage />);
    await screen.findByRole("button", { name: GUIDANCE });
    expect(h1s()).toEqual(["Monitoring"]);
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
