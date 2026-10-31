// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import AppHome from "@/app/app/page";
import { initialSample, sampleReducer } from "@/components/app/SampleState";
import { getMe, listAnalyses } from "@/lib/app/client";
import { SAMPLE_ALERTS } from "@/lib/app/mock/alerts";
import { saveAppSession } from "@/lib/app/session";

const navigation = vi.hoisted(() => ({ pathname: "/app", router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/app/client");

const org = (overrides: Partial<OrgView> = {}): OrgView => ({
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true, ...overrides,
});

function signedIn(platformAdmin = false, organization = org()) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  const me: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations: [organization], platformAdmin };
  vi.mocked(getMe).mockResolvedValue(me);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
});
afterEach(cleanup);

describe("the /app shell", () => {
  it("groups the navigation and marks the current page, including the pages under it", async () => {
    signedIn();
    navigation.pathname = "/app/analyses/sc_1";
    render(<AppLayout>{<p>page</p>}</AppLayout>);
    const nav = await screen.findByRole("navigation", { name: "App" });
    expect(within(nav).getByText("Workspace")).toBeTruthy();
    expect(within(nav).getByText("Organization")).toBeTruthy();
    expect(within(nav).getByRole("link", { name: /^Analyses/ }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: /^Overview/ }).getAttribute("aria-current")).toBeNull();
  });

  it("links to the platform admin page only for a platform admin", async () => {
    signedIn(false);
    const { unmount } = render(<AppLayout>{<p>page</p>}</AppLayout>);
    await screen.findByRole("navigation", { name: "App" });
    expect(screen.queryByRole("link", { name: /Platform admin/ })).toBeNull();
    unmount();
    signedIn(true);
    render(<AppLayout>{<p>page</p>}</AppLayout>);
    expect(await screen.findByRole("link", { name: /Platform admin/ })).toBeTruthy();
  });

  it("finds a page from the search box and opens it with Enter", async () => {
    signedIn();
    render(<AppLayout>{<p>page</p>}</AppLayout>);
    const search = await screen.findByRole("searchbox", { name: "Search the workspace" });
    await userEvent.type(search, "monitor");
    expect(within(screen.getByRole("list", { name: "Search results" })).getByText("Monitoring")).toBeTruthy();
    await userEvent.keyboard("{Enter}");
    expect(navigation.router.push).toHaveBeenCalledWith("/app/monitoring");
  });

  it("marks every notification as read from the bell", async () => {
    signedIn();
    render(<AppLayout>{<p>page</p>}</AppLayout>);
    const unread = SAMPLE_ALERTS.filter(alert => !alert.read).length;
    await userEvent.click(await screen.findByRole("button", { name: `Notifications, ${unread} unread` }));
    await userEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
  });

  it("labels the Overview's sample blocks and keeps the coverage fact unlabelled", async () => {
    signedIn();
    render(<AppLayout>{<AppHome />}</AppLayout>);
    expect((await screen.findAllByText(/^Sample data/)).length).toBeGreaterThan(3);
    expect(screen.getByText("ARCA does not bind policies yet")).toBeTruthy();
  });
});

describe("the sample state", () => {
  it("moves an action and assigns it", () => {
    const start = initialSample();
    const id = start.actions[0].id;
    const moved = sampleReducer(sampleReducer(start, { type: "action.status", id, status: "done" }), {
      type: "action.assignee", id, assignee: null,
    });
    expect(moved.actions[0]).toMatchObject({ status: "done", assignee: null });
    expect(start.actions[0].status).not.toBe("done");
  });

  it("turns an alert into an action once, and reads it", () => {
    const start = initialSample();
    const alert = start.alerts.find(item => !item.read)!;
    const once = sampleReducer(start, { type: "action.from_alert", alert });
    const twice = sampleReducer(once, { type: "action.from_alert", alert });
    expect(twice.actions.length).toBe(start.actions.length + 1);
    expect(twice.actions[0].title).toBe(alert.suggestedAction);
    expect(twice.alerts.find(item => item.id === alert.id)?.read).toBe(true);
  });

  it("dismisses an alert and reads them all", () => {
    const start = initialSample();
    const dismissed = sampleReducer(start, { type: "alert.dismiss", id: start.alerts[0].id });
    expect(dismissed.alerts.length).toBe(start.alerts.length - 1);
    expect(sampleReducer(dismissed, { type: "alert.read_all" }).alerts.every(alert => alert.read)).toBe(true);
  });
});
