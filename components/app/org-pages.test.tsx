// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import BillingPage from "@/app/app/billing/page";
import MembersPage from "@/app/app/members/page";
import SettingsPage from "@/app/app/settings/page";
import { PREVIEW_ONLY } from "@/components/app/ui";
import { getMe, getPlans, listAnalyses, listMembers } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

// The same harness as app-flow.test.tsx: the real /app layout, with the API client and Next's router mocked.
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
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

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  const response: MeResponse = { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
  vi.mocked(getMe).mockResolvedValue(response);
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.query = "";
  navigation.params = {};
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(listMembers).mockResolvedValue({
    members: [
      { userId: "u_owner", email: "owner@smithlaw.com", role: "owner", joinedAt: "2026-10-25T10:00:00.000Z" },
      { userId: "u_member", email: "member@smithlaw.com", role: "member", joinedAt: "2026-10-26T10:00:00.000Z" },
    ],
    invitations: [],
  });
  vi.mocked(getPlans).mockResolvedValue([
    { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("members", () => {
  it("filters the people by email as you type, and shows the real join date", async () => {
    signedIn(org());
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(screen.getByText("Joined Oct 25, 2026")).toBeTruthy();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search members by email" }), "MEMBER@");
    expect(screen.queryByText("owner@smithlaw.com")).toBeNull();
    expect(screen.getByText("member@smithlaw.com")).toBeTruthy();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search members by email" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search members by email" }), "nobody");
    expect(screen.getByText("No member matches that search.")).toBeTruthy();
  });

  it("draws the permission matrix from the contract: the owner manages billing and a viewer does not", async () => {
    signedIn(org());
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    const cells = within(screen.getByRole("row", { name: /^Manage billing/ })).getAllByRole("cell");
    // Columns follow ROLES: owner, admin, member, viewer.
    expect(cells.map(cell => cell.textContent)).toEqual(["Allowed", "Not allowed", "Not allowed", "Not allowed"]);
    const read = within(screen.getByRole("row", { name: /^View the organization/ })).getAllByRole("cell");
    expect(read.every(cell => cell.textContent === "Allowed")).toBe(true);
  });

  it("offers ownership transfer only as coming soon", async () => {
    signedIn(org());
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /Transfer ownership/ }).disabled).toBe(true);
  });
});

describe("billing", () => {
  it("lists sample invoices without any amount, with the download disabled", async () => {
    signedIn(org());
    inApp("/app/billing", <BillingPage />);
    const table = await screen.findByRole("table", { name: "Invoices" });
    expect(table.textContent).toContain("INV-0001");
    expect(table.textContent).not.toContain("$");
    const downloads = within(table).getAllByRole<HTMLButtonElement>("button", { name: /^Download/ });
    expect(downloads.length).toBeGreaterThan(0);
    expect(downloads.every(item => item.disabled)).toBe(true);
    expect(screen.getAllByText("Sample data").length).toBeGreaterThan(0);
  });

  it("shows no sample invoices to an organization that has not paid", async () => {
    signedIn(org({ billingStatus: "pending_payment", paidAccess: false }));
    inApp("/app/billing", <BillingPage />);
    await screen.findByRole("button", { name: "Pay with Monthly (example price)" });
    expect(screen.queryByRole("table", { name: "Invoices" })).toBeNull();
    expect(screen.getByText("No invoices yet. They appear here once a plan is active.")).toBeTruthy();
  });

  it("answers Save on the billing contact with the preview notice, not a success", async () => {
    signedIn(org());
    inApp("/app/billing", <BillingPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByText(PREVIEW_ONLY)).toBeTruthy();
  });
});

describe("settings", () => {
  const SECTIONS = [
    ["General", "#general"],
    ["Notifications", "#notifications"],
    ["Security", "#security"],
    ["Integrations", "#integrations"],
    ["Data & privacy", "#data-privacy"],
  ];

  it("renders every section with its anchor, and the deletion form without a click", async () => {
    signedIn(org());
    inApp("/app/settings", <SettingsPage />);
    await screen.findByText("Smith Law", { selector: "dd" });
    const index = screen.getByRole("navigation", { name: "Settings sections" });
    for (const [label, href] of SECTIONS) {
      expect(screen.getByRole("heading", { name: label })).toBeTruthy();
      expect(within(index).getByRole("link", { name: label }).getAttribute("href")).toBe(href);
      expect(document.getElementById(href.slice(1))).toBeTruthy();
    }
    expect(screen.getByLabelText("Reason")).toBeTruthy();
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
  });

  it("flips a notification switch locally", async () => {
    signedIn(org());
    inApp("/app/settings", <SettingsPage />);
    const toggle = await screen.findByRole("button", { name: "Member changes" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("answers the firm profile and the session sign-out with the preview notice", async () => {
    signedIn(org());
    inApp("/app/settings", <SettingsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Sign out other sessions" }));
    expect(await screen.findByText(PREVIEW_ONLY)).toBeTruthy();
    expect(screen.getByText("Safari on iPhone")).toBeTruthy();
  });
});
