// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView } from "@arca/contracts";

import ActionPlanPage from "@/app/app/action-plan/page";
import AppLayout from "@/app/app/layout";
import MonitoringPage from "@/app/app/monitoring/page";
import { getActionPlan, getMe, listAnalyses } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

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

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [] });
});

afterEach(cleanup);

describe("the workspace preview pages", () => {
  it.each<[string, () => ReactElement, string]>([
    ["/app/action-plan", () => <ActionPlanPage />, "Choose a plan to unlock the action plan"],
    ["/app/monitoring", () => <MonitoringPage />, "Choose a plan to unlock monitoring"],
  ])("locks %s for an organization that has not paid, and asks the API nothing", async (pathname, page, title) => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp(pathname, page());
    expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See plans" }).getAttribute("href")).toBe("/app/billing");
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(listAnalyses).not.toHaveBeenCalled();
    expect(getActionPlan).not.toHaveBeenCalled();
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
});
