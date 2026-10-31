// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnalysisView, MeResponse, OrgView } from "@arca/contracts";

import ActionPlanPage from "@/app/app/action-plan/page";
import ActivityPage from "@/app/app/activity/page";
import AppLayout from "@/app/app/layout";
import MonitoringPage from "@/app/app/monitoring/page";
import { fixtureResult } from "@/lib/api/fixture";
import { getMe, listAnalyses } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";
import { fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";

const navigation = vi.hoisted(() => ({
  pathname: "/app",
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
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

/** A page as Next renders it: inside the /app layout, so the sample state is the shared one. */
function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const select = (name: string) => screen.getByRole<HTMLSelectElement>("combobox", { name });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
});

afterEach(cleanup);

describe("the workspace preview pages", () => {
  it.each<[string, () => ReactElement, string]>([
    ["/app/action-plan", () => <ActionPlanPage />, "Choose a plan to unlock the action plan"],
    ["/app/monitoring", () => <MonitoringPage />, "Choose a plan to unlock monitoring"],
    ["/app/activity", () => <ActivityPage />, "Choose a plan to unlock the activity log"],
  ])("locks %s for an organization that has not paid, and asks the API nothing", async (pathname, page, title) => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp(pathname, page());
    expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See plans" }).getAttribute("href")).toBe("/app/billing");
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(listAnalyses).not.toHaveBeenCalled();
  });

  it("moves an action to Done when its status changes, and keeps the assessment's own actions alongside", async () => {
    signedIn(org());
    vi.mocked(listAnalyses).mockResolvedValue([analysis()]);
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Action plan", level: 1 });
    const review = "Require a second review of AI-drafted filings";
    expect(within(screen.getByRole("list", { name: "Actions to do" })).getByText(review)).toBeTruthy();
    await user.selectOptions(select(`Status for “${review}”`), "done");
    expect(within(screen.getByRole("list", { name: "Actions done" })).getByText(review)).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Actions to do" })).queryByText(review)).toBeNull();

    // The real assessment's action, kept in the page's own state.
    const real = "Document the policy";
    const todo = await screen.findByRole("list", { name: "Actions to do" });
    expect(await within(todo).findByText(real)).toBeTruthy();
    expect(screen.getByText("From your assessment")).toBeTruthy();
    await user.selectOptions(select(`Status for “${real}”`), "in_progress");
    expect(within(screen.getByRole("list", { name: "Actions in progress" })).getByText(real)).toBeTruthy();

    await user.selectOptions(select(`Assignee for “${real}”`), "tm_sam");
    await user.selectOptions(select("Filter by assignee"), "tm_sam");
    expect(screen.getByText(real)).toBeTruthy();
    expect(screen.queryByText(review)).toBeNull();
    expect(screen.queryByRole("list", { name: "Action plan" })).toBeNull();
  });

  it("says adding an action is a preview and adds nothing", async () => {
    signedIn(org());
    inApp("/app/action-plan", <ActionPlanPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add an action" }));
    const dialog = screen.getByRole("dialog", { name: "Add an action" });
    await user.type(within(dialog).getByRole("textbox", { name: "Title" }), "Write a disclosure clause");
    await user.click(within(dialog).getByRole("button", { name: "Add action" }));
    expect(await screen.findByText("Preview only: this isn't connected yet.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Write a disclosure clause")).toBeNull();
  });

  it("turns an alert into an action in the shared action plan", async () => {
    signedIn(org());
    const view = inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /A state bar published new guidance/ }));
    const drawer = screen.getByRole("dialog", { name: "A state bar published new guidance on generative AI in filings" });
    expect(within(drawer).getByText("Add a citation check to your filing checklist.")).toBeTruthy();
    await user.click(within(drawer).getByRole("button", { name: "Create action" }));
    expect(await screen.findByText("Added to the action plan preview.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /A state bar published new guidance/ }).textContent).not.toContain("(unread)");

    // Same layout, another page: the sample state carries over, as it does when the user follows the sidebar.
    navigation.pathname = "/app/action-plan";
    view.rerender(<AppLayout><ActionPlanPage /></AppLayout>);
    const todo = await screen.findByRole("list", { name: "Actions to do" });
    expect(within(todo).getByText("Add a citation check to your filing checklist.")).toBeTruthy();
  });

  it("dismisses an alert, and marks all as read", async () => {
    signedIn(org());
    inApp("/app/monitoring", <MonitoringPage />);
    const user = userEvent.setup();

    const title = /Your website no longer links to an AI policy/;
    await user.click(await screen.findByRole("button", { name: title }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: title })).toBeNull();
    expect(screen.getByRole("button", { name: /^Firm signals/ }).textContent).toBe("Firm signals1");

    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(within(screen.getByRole("list", { name: "Alerts" })).queryByText("(unread)", { exact: false })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("filters the activity log by kind and by person", async () => {
    signedIn(org());
    inApp("/app/activity", <ActivityPage />);
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Activity", level: 1 });
    expect(screen.getByText("Sample data")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Export CSV/ }).disabled).toBe(true);
    expect(screen.getByText("ran the monthly re-scan of the firm's website")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Billing/ }));
    expect(screen.getByText("started the monthly plan")).toBeTruthy();
    expect(screen.queryByText("ran the monthly re-scan of the firm's website")).toBeNull();

    await user.click(screen.getByRole("button", { name: /^All/ }));
    await user.selectOptions(select("Filter by person"), "Luis Ortega");
    expect(screen.getByText("turned on the weekly alert summary")).toBeTruthy();
    expect(screen.queryByText("started the monthly plan")).toBeNull();
  });
});
