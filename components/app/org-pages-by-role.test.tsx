// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MeResponse, OrgView, Role } from "@arca/contracts";

import AppLayout from "@/app/app/layout";
import BillingPage from "@/app/app/billing/page";
import CoveragePage from "@/app/app/coverage/page";
import DocumentsPage from "@/app/app/documents/page";
import HelpPage from "@/app/app/help/page";
import MembersPage from "@/app/app/members/page";
import SettingsPage from "@/app/app/settings/page";
import { ApiError } from "@/lib/api/client";
import { getActionPlan, getMe, getPlans, listAnalyses, listMembers, renameOrg, setMemberRole } from "@/lib/app/client";
import { saveAppSession } from "@/lib/app/session";

// DN-11 §6.2 on the organization and information pages: what each role sees and can change on Members, Billing, Settings,
// Coverage, Documents and Help. A read-only page drops its controls and says once who can make the change; the debug
// switch brings them back in mock only. The same harness as app-flow.test.tsx: the real /app layout, the client mocked.

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
const future = () => new Date(Date.now() + 3_600_000).toISOString();

const org = (overrides: Partial<OrgView> = {}): OrgView => ({
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true, ...overrides,
});
const UNPAID = { billingStatus: "pending_payment", paidAccess: false } as const;

function me(organizations: OrgView[]): MeResponse {
  return { user: { id: "u_me", email: "me@smithlaw.com" }, organizations, platformAdmin: false };
}

function signedIn(...organizations: OrgView[]) {
  saveAppSession({ token: "app-token", email: "me@smithlaw.com", expiresAt: future() });
  vi.mocked(getMe).mockResolvedValue(me(organizations));
}

function inApp(pathname: string, page: ReactElement) {
  navigation.pathname = pathname;
  return render(<AppLayout>{page}</AppLayout>);
}

const has = (role: "button" | "combobox" | "link" | "heading", name: string | RegExp) =>
  screen.queryByRole(role, { name }) !== null;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);
  navigation.pathname = "/app";
  vi.mocked(listAnalyses).mockResolvedValue([]);
  vi.mocked(getActionPlan).mockResolvedValue({ source: null, items: [] });
  vi.mocked(getPlans).mockResolvedValue([
    { code: "monthly", name: "Monthly (example price)", amountCents: 49_900, currency: "usd", interval: "month" },
  ]);
  vi.mocked(listMembers).mockResolvedValue({
    members: [
      { userId: "u_owner", email: "owner@smithlaw.com", role: "owner", joinedAt: "2026-10-25T10:00:00.000Z" },
      { userId: "u_member", email: "member@smithlaw.com", role: "member", joinedAt: "2026-10-25T11:00:00.000Z" },
    ],
    invitations: [{ id: "inv_1", email: "new@smithlaw.com", role: "viewer", expiresAt: "2026-11-01T10:00:00.000Z" }],
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("members", () => {
  const MEMBERS_NOTE = "Ask an owner or admin to invite people or change roles.";
  const controls = () => ({
    invite: has("button", "Send invitation"),
    removeOwner: has("button", "Remove owner@smithlaw.com"),
    removeMember: has("button", "Remove member@smithlaw.com"),
    ownerRole: has("combobox", "Role for owner@smithlaw.com"),
    memberRole: has("combobox", "Role for member@smithlaw.com"),
    revoke: has("button", "Revoke invitation for new@smithlaw.com"),
    transfer: has("button", /Transfer ownership/),
    note: screen.queryByText(MEMBERS_NOTE) !== null,
  });
  const ALL = { invite: true, removeOwner: true, removeMember: true, ownerRole: true, memberRole: true, revoke: true, transfer: true, note: false };
  const NONE = { invite: false, removeOwner: false, removeMember: false, ownerRole: false, memberRole: false, revoke: false, transfer: false, note: true };

  it.each<[Role, ReturnType<typeof controls>]>([
    ["owner", ALL],
    // An admin manages everyone but an owner, and never transfers ownership.
    ["admin", { ...ALL, removeOwner: false, ownerRole: false, transfer: false }],
    ["member", NONE],
    ["viewer", NONE],
  ])("gives a %s only the controls its role allows while the switch is off", async (role, expected) => {
    signedIn(org({ role }));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(controls()).toEqual(expected);
    // The people, the invitations and the permission table stay readable for everyone.
    expect(screen.getByText("new@smithlaw.com")).toBeTruthy();
    expect(screen.getByRole("row", { name: /^Manage billing/ })).toBeTruthy();
  });

  it("shows an admin an owner's role as text, and never offers to make someone an owner", async () => {
    signedIn(org({ role: "admin" }));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    const ownerRow = screen.getByText("owner@smithlaw.com").closest("li")!;
    expect(within(ownerRow).getByText("Owner")).toBeTruthy();
    const options = within(screen.getByRole("combobox", { name: "Role for member@smithlaw.com" })).getAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual(["Admin", "Member", "Viewer"]);
  });

  it("in mock with the switch on, gives a member every control so the back's 403 shows", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "member" }));
    vi.mocked(setMemberRole).mockRejectedValue(new ApiError("forbidden", "Your role does not allow this"));
    inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(controls()).toEqual(ALL);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Role for member@smithlaw.com" }), "viewer");
    expect(setMemberRole).toHaveBeenCalledExactlyOnceWith("org_1", "u_member", "viewer");
    expect((await screen.findByRole("alert")).textContent).toContain("Your role does not allow this");
  });
});

describe("billing (D10: open to every role, managed by the owner)", () => {
  const NOTE = "Only the owner can manage billing.";
  const OWNER_SEES = "Your organization's plan, its invoices and who receives them.";
  const view = () => ({
    note: screen.queryByText(NOTE) !== null,
    manage: has("button", "Manage billing"),
    invoices: has("heading", "Invoices"),
    contact: has("heading", "Billing contact"),
    // The page's description names only what the role sees below it.
    description: screen.getByText(/^Your organization's plan/).textContent,
  });

  it.each<[Role, ReturnType<typeof view>]>([
    ["owner", { note: false, manage: true, invoices: true, contact: true, description: OWNER_SEES }],
    ["admin", { note: true, manage: false, invoices: true, contact: false, description: "Your organization's plan and its invoices." }],
    ["member", { note: true, manage: false, invoices: false, contact: false, description: "Your organization's plan." }],
    ["viewer", { note: true, manage: false, invoices: false, contact: false, description: "Your organization's plan." }],
  ])("shows a %s of a paid organization what its role reads and manages", async (role, expected) => {
    signedIn(org({ role }));
    inApp("/app/billing", <BillingPage />);
    expect(await screen.findByText("Active")).toBeTruthy();
    expect(view()).toEqual(expected);
    // The sample invoices come with their label, and only to the owner and the admin.
    expect(screen.queryByRole("table", { name: "Invoices" }) !== null).toBe(expected.invoices);
    expect(screen.queryAllByText("Sample data").length > 0).toBe(expected.invoices);
  });

  it("lets the owner of an unpaid organization pay", async () => {
    signedIn(org({ role: "owner", ...UNPAID }));
    inApp("/app/billing", <BillingPage />);
    const pay = await screen.findByRole<HTMLButtonElement>("button", { name: "Pay with Monthly (example price)" });
    expect(pay.disabled).toBe(false);
    expect(screen.getByText("Choose a plan to open your organization's analyses.")).toBeTruthy();
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it.each<Role>(["admin", "member", "viewer"])(
    "never leaves a %s of an unpaid organization at a dead end: the status, the plans, who pays and a way on",
    async role => {
      signedIn(org({ role, ...UNPAID }));
      inApp("/app/billing", <BillingPage />);
      expect(await screen.findByText("Monthly (example price)")).toBeTruthy();
      expect(screen.queryByText("Your role can't open this page")).toBeNull();
      expect(screen.getByText("Pending payment")).toBeTruthy();
      expect(screen.getByText(NOTE)).toBeTruthy();
      expect(screen.getByText(/Your organization's analyses open once the owner chooses a plan\./)).toBeTruthy();
      expect(screen.getByRole("link", { name: "Contact ARCA" }).getAttribute("href")).toBe("/app/help");
      expect(screen.queryByRole("button", { name: /^Pay with/ })).toBeNull();
    },
  );

  it("shows the admin of an unpaid organization no invoices, not sample ones, and nothing to pay with", async () => {
    signedIn(org({ role: "admin", ...UNPAID }));
    inApp("/app/billing", <BillingPage />);
    expect(await screen.findByText("Monthly (example price)")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Invoices" })).toBeTruthy();
    expect(screen.getByText("No invoices yet. They appear here once a plan is active.")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Invoices" })).toBeNull();
    expect(screen.queryByText("Sample data")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Pay with/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Billing contact" })).toBeNull();
    expect(screen.getByText("Your organization's plan and its invoices.")).toBeTruthy();
  });

  it("in mock with the switch on, gives a member the owner's controls so the back's 403 shows", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "member" }));
    inApp("/app/billing", <BillingPage />);
    expect(await screen.findByRole("button", { name: "Manage billing" })).toBeTruthy();
    expect(view()).toEqual({ note: false, manage: true, invoices: true, contact: true, description: OWNER_SEES });
  });
});

describe("settings", () => {
  const view = () => ({
    rename: has("button", "Rename"),
    profileForm: has("button", "Save"),
    deletion: has("button", "Request deletion"),
    transfer: has("heading", "Transfer ownership"),
    // Personal sections: everyone keeps them.
    notifications: has("button", "Member changes"),
    sessions: has("button", "Sign out other sessions"),
  });

  it.each<[Role, ReturnType<typeof view>, string | null]>([
    ["owner", { rename: true, profileForm: true, deletion: true, transfer: true, notifications: true, sessions: true }, null],
    [
      "admin",
      { rename: true, profileForm: true, deletion: false, transfer: false, notifications: true, sessions: true },
      "Only the owner can request the organization's deletion or transfer its ownership.",
    ],
    [
      "member",
      { rename: false, profileForm: false, deletion: false, transfer: false, notifications: true, sessions: true },
      "Ask an owner or admin to change the organization's details. Only the owner can request its deletion.",
    ],
    [
      "viewer",
      { rename: false, profileForm: false, deletion: false, transfer: false, notifications: true, sessions: true },
      "Ask an owner or admin to change the organization's details. Only the owner can request its deletion.",
    ],
  ])("gives a %s its own sections and only the organization's it may change", async (role, expected, note) => {
    signedIn(org({ role }));
    inApp("/app/settings", <SettingsPage />);
    await screen.findByText("Smith Law", { selector: "dd" });
    expect(view()).toEqual(expected);
    expect(screen.queryByLabelText("Reason") !== null).toBe(expected.deletion);
    if (note) expect(screen.getByText(note)).toBeTruthy();
    else expect(screen.queryByText(/^Only the owner|^Ask an owner/)).toBeNull();
  });

  it("shows the firm profile to a viewer as text, still labelled as sample data", async () => {
    signedIn(org({ role: "viewer" }));
    inApp("/app/settings", <SettingsPage />);
    await screen.findByText("Smith Law", { selector: "dd" });
    expect(screen.getByText("Immigration, Personal injury")).toBeTruthy();
    expect(screen.queryByLabelText("Primary state")).toBeNull();
    expect(screen.getAllByText("Sample data").length).toBeGreaterThan(0);
  });

  it("tells a member that a deletion is pending, without the form", async () => {
    signedIn(org({ role: "member", deletionPending: true }));
    inApp("/app/settings", <SettingsPage />);
    expect(await screen.findByText(/A deletion request is pending review/)).toBeTruthy();
    expect(screen.queryByLabelText("Reason")).toBeNull();
  });

  it.each<Role>(["owner", "admin"])("lets an %s rename the organization for real, and reads /me again", async role => {
    signedIn(org({ role }));
    vi.mocked(renameOrg).mockResolvedValue(org({ role, name: "Smith & Jones Law" }));
    inApp("/app/settings", <SettingsPage />);
    const input = await screen.findByLabelText<HTMLInputElement>("Organization name");
    expect(input.value).toBe("Smith Law");
    const rename = screen.getByRole<HTMLButtonElement>("button", { name: "Rename" });
    // Nothing to send until the name changes.
    expect(rename.disabled).toBe(true);
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
    vi.mocked(getMe).mockResolvedValue(me([org({ role, name: "Smith & Jones Law" })]));

    await userEvent.clear(input);
    await userEvent.type(input, "  Smith & Jones Law ");
    await userEvent.click(rename);
    expect(renameOrg).toHaveBeenCalledExactlyOnceWith("org_1", "Smith & Jones Law");
    expect(await screen.findByText("Name saved.")).toBeTruthy();
    expect(await screen.findByText("Smith & Jones Law", { selector: "dd" })).toBeTruthy();
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it("keeps Rename off once the name is saved, while /me still has the old one", async () => {
    signedIn(org({ role: "owner" }));
    vi.mocked(renameOrg).mockResolvedValue(org({ name: "Smith & Jones Law" }));
    inApp("/app/settings", <SettingsPage />);
    const input = await screen.findByLabelText<HTMLInputElement>("Organization name");
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
    // The reload that follows the rename has not answered yet: General still shows the old name.
    vi.mocked(getMe).mockReturnValue(new Promise(() => undefined));

    await userEvent.clear(input);
    await userEvent.type(input, "Smith & Jones Law");
    const rename = screen.getByRole<HTMLButtonElement>("button", { name: "Rename" });
    await userEvent.click(rename);
    expect(await screen.findByText("Name saved.")).toBeTruthy();
    expect(screen.getByText("Smith Law", { selector: "dd" })).toBeTruthy();
    expect(rename.disabled).toBe(true);
    await userEvent.click(rename);
    expect(renameOrg).toHaveBeenCalledOnce();

    // A different name can still be sent.
    await userEvent.type(input, " LLP");
    expect(rename.disabled).toBe(false);
  });

  it("shows the API's reason when the rename is refused", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "viewer" }));
    vi.mocked(renameOrg).mockRejectedValue(new ApiError("forbidden", "Your role does not allow this"));
    inApp("/app/settings", <SettingsPage />);
    const input = await screen.findByLabelText("Organization name");
    await userEvent.type(input, " LLP");
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Your role does not allow this");
    expect(screen.queryByText("Name saved.")).toBeNull();
    // The switch brought back the owner's sections too.
    expect(screen.getByRole("button", { name: "Request deletion" })).toBeTruthy();
  });
});

describe("coverage", () => {
  const NOTE = "Ask an owner or admin to request a quote, connect with a broker or report an incident.";
  const BUTTONS = ["Request a quote", "Connect with a broker", "Report an incident"];

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: every button follows org.update",
    async (role, allowed) => {
      signedIn(org({ role }));
      inApp("/app/coverage", <CoveragePage />);
      expect(await screen.findByRole("heading", { name: "No active policy" })).toBeTruthy();
      expect(BUTTONS.map(name => has("button", name))).toEqual(BUTTONS.map(() => allowed));
      expect(screen.queryByText(NOTE) !== null).toBe(!allowed);
      // What the policy would cover reads the same for everyone.
      expect(screen.getByText("AI Work Product Errors")).toBeTruthy();
    },
  );

  it.each<Role>(["member", "viewer"])("in mock with the switch on, gives a %s every button back", async role => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role }));
    inApp("/app/coverage", <CoveragePage />);
    expect(await screen.findByRole("heading", { name: "No active policy" })).toBeTruthy();
    expect(BUTTONS.map(name => has("button", name))).toEqual(BUTTONS.map(() => true));
    expect(screen.queryByText(NOTE)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Request a quote" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});

describe("documents", () => {
  const NOTE = "Ask an owner or admin to add evidence files.";

  it.each<[Role, boolean]>([["owner", true], ["admin", true], ["member", false], ["viewer", false]])(
    "%s: downloads, and adds evidence only with org.update",
    async (role, allowed) => {
      signedIn(org({ role }));
      inApp("/app/documents", <DocumentsPage />);
      expect(await screen.findByRole("button", { name: "Download AI use policy template" })).toBeTruthy();
      expect(screen.queryByLabelText(/Add evidence files/) !== null).toBe(allowed);
      expect(has("heading", "Evidence")).toBe(allowed);
      expect(screen.queryByText(NOTE) !== null).toBe(!allowed);
    },
  );

  it.each<Role>(["member", "viewer"])("in mock with the switch on, gives a %s the evidence upload back", async role => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role }));
    inApp("/app/documents", <DocumentsPage />);
    expect(await screen.findByRole("button", { name: "Download AI use policy template" })).toBeTruthy();
    expect(screen.getByLabelText(/Add evidence files/)).toBeTruthy();
    expect(has("heading", "Evidence")).toBe(true);
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});

describe("the permissions' words", () => {
  it("words each permission the same on Members and in Help", async () => {
    signedIn(org({ role: "owner" }));
    const members = inApp("/app/members", <MembersPage />);
    await screen.findByText("owner@smithlaw.com");
    expect(screen.getByRole("row", { name: /^Assign actions and add or delete the organization's own/ })).toBeTruthy();
    expect(screen.getByRole("row", { name: /^See the organization and its analyses/ })).toBeTruthy();
    members.unmount();

    inApp("/app/help", <HelpPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Who sees what in my organization?" }));
    const owner = screen.getByText("Owner", { selector: "span" }).closest("li")!;
    expect(owner.textContent).toContain("assign actions and add or delete the organization's own");
    expect(owner.textContent).toContain("see the organization and its analyses");
  });
});

describe("help", () => {
  it.each<Role>(["owner", "admin", "member", "viewer"])("is the same for a %s", async role => {
    signedIn(org({ role }));
    inApp("/app/help", <HelpPage />);
    expect(await screen.findByRole("heading", { name: "Frequently asked questions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Who sees what in my organization?" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "hello@arcacover.com" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeTruthy();
    expect(screen.queryByText(/^Ask an owner|^Only the owner/)).toBeNull();
  });
});

// DN-11 §6.4: the switch is read through the bridge's literal guard, so outside mock the key in the tab's storage shows
// nothing a viewer may not see.
describe.each([undefined, "production", "live-debug"])("with the switch's key set and the mode %s", mode => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    sessionStorage.setItem(SWITCH_KEY, "1");
    signedIn(org({ role: "viewer" }));
  });

  it("shows a viewer no organization control on any of these pages", async () => {
    const pages: [string, () => ReactElement, string | RegExp][] = [
      ["/app/members", () => <MembersPage />, "owner@smithlaw.com"],
      ["/app/billing", () => <BillingPage />, "Active"],
      ["/app/settings", () => <SettingsPage />, "Recent sessions"],
      ["/app/coverage", () => <CoveragePage />, "No active policy"],
      ["/app/documents", () => <DocumentsPage />, "Firm documents"],
    ];
    for (const [pathname, page, ready] of pages) {
      const view = inApp(pathname, page());
      await screen.findByText(ready);
      for (const name of [
        "Send invitation", "Remove owner@smithlaw.com", "Manage billing", "Rename", "Request deletion", "Request a quote",
      ]) {
        expect(has("button", name)).toBe(false);
      }
      expect(screen.queryByLabelText(/Add evidence files/)).toBeNull();
      expect(screen.queryByRole("table", { name: "Invoices" })).toBeNull();
      view.unmount();
    }
    expect(sessionStorage.getItem(SWITCH_KEY)).toBe("1");
  });
});
