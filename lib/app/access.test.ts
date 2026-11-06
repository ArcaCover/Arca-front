// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { PERMISSIONS, ROLES, type OrgView, type Role } from "@arca/contracts";

import { AppContext, type AppState } from "@/components/app/AppContext";
import { setShowForbidden } from "@/lib/debug/bridge";

import { allows, canOpen, navItems, overviewVariant, useAccess, useCan, useOverviewVariant } from "./access";

// DN-11 §6.2: what each role opens, lists and gets. Every rule yields to the debug switch, which exists in mock only.

const PAGES = [
  "/app", "/app/analyses", "/app/analyses/sc_1", "/app/action-plan", "/app/monitoring", "/app/coverage", "/app/documents",
  "/app/members", "/app/billing", "/app/settings", "/app/help",
];

const labels = (role: Role, options?: Parameters<typeof navItems>[1]) => {
  const { groups, footer } = navItems(role, options);
  return { groups: groups.map(group => [group.label, group.items.map(item => item.label)]), footer: footer.map(item => item.label) };
};

describe("canOpen", () => {
  it.each(ROLES)("opens every page but the activity to a %s, and the activity to an owner or admin only", role => {
    for (const page of PAGES) expect(canOpen(role, page)).toBe(true);
    const activity = role === "owner" || role === "admin";
    expect(canOpen(role, "/app/activity")).toBe(activity);
    expect(canOpen(role, "/app/activity/older")).toBe(activity);
  });

  it("does not take a page that only starts like the activity for it", () => {
    expect(canOpen("viewer", "/app/activityfeed")).toBe(true);
  });

  it.each(ROLES)("opens everything to a %s while the switch is on", role => {
    for (const page of [...PAGES, "/app/activity"]) expect(canOpen(role, page, true)).toBe(true);
  });
});

describe("navItems", () => {
  const WORKSPACE = ["Workspace", ["Overview", "Analyses", "Action plan", "Monitoring", "Coverage", "Documents"]];

  it.each<Role>(["owner", "admin"])("lists every page to an %s", role => {
    expect(labels(role)).toEqual({
      groups: [WORKSPACE, ["Organization", ["Members", "Billing", "Settings", "Activity"]]],
      footer: ["Help & support"],
    });
  });

  // D10: billing still opens for them, read-only, from the plan status at the foot of the sidebar.
  it.each<Role>(["member", "viewer"])("leaves billing and the activity out for a %s", role => {
    expect(labels(role)).toEqual({ groups: [WORKSPACE, ["Organization", ["Members", "Settings"]]], footer: ["Help & support"] });
  });

  it.each(ROLES)("lists everything to a %s while the switch is on", role => {
    expect(labels(role, { forbiddenShown: true })).toEqual(labels("owner"));
  });

  it("adds the platform admin page for a platform admin only, whatever the switch", () => {
    expect(labels("viewer", { platformAdmin: true }).footer).toEqual(["Help & support", "Platform admin"]);
    expect(labels("owner", { forbiddenShown: true }).footer).toEqual(["Help & support"]);
  });
});

describe("overviewVariant", () => {
  // The table of DN-11 §6.3, card by card.
  it.each<[Role, ReturnType<typeof overviewVariant>]>([
    ["owner", {
      stats: ["open_actions", "alerts", "members", "coverage"],
      quickActions: ["new_analysis", "invite", "download_report", "broker", "book_call"],
      nextActions: { mineFirst: false, checkboxes: true },
    }],
    ["admin", {
      stats: ["open_actions", "alerts", "members", "coverage"],
      quickActions: ["new_analysis", "invite", "download_report", "broker", "book_call"],
      nextActions: { mineFirst: false, checkboxes: true },
    }],
    ["member", {
      stats: ["my_open_actions", "alerts", "coverage"],
      quickActions: ["book_call", "help"],
      nextActions: { mineFirst: true, checkboxes: true },
    }],
    ["viewer", {
      stats: ["open_actions", "coverage"],
      quickActions: ["book_call"],
      nextActions: { mineFirst: false, checkboxes: false },
    }],
  ])("gives a %s its own Overview", (role, variant) => {
    expect(overviewVariant(role)).toEqual(variant);
  });

  it("brings back every control with the switch, and keeps the role's cards and order", () => {
    expect(overviewVariant("viewer", true)).toEqual({
      stats: ["open_actions", "coverage"],
      quickActions: ["new_analysis", "invite", "download_report", "broker", "book_call"],
      nextActions: { mineFirst: false, checkboxes: true },
    });
    expect(overviewVariant("member", true)).toEqual({
      stats: ["my_open_actions", "alerts", "coverage"],
      quickActions: ["new_analysis", "invite", "download_report", "broker", "book_call", "help"],
      nextActions: { mineFirst: true, checkboxes: true },
    });
    expect(overviewVariant("owner", true)).toEqual(overviewVariant("owner"));
  });
});

describe("allows", () => {
  it("follows the contract's table, where a member only tracks actions (D2)", () => {
    const granted = (role: Role) => PERMISSIONS.filter(permission => allows(role, permission));
    expect(granted("owner")).toEqual([...PERMISSIONS]);
    expect(granted("member")).toEqual(["org.read", "actions.update"]);
    expect(granted("viewer")).toEqual(["org.read"]);
    expect(granted("admin")).not.toContain("billing.manage");
    expect(granted("admin")).toContain("actions.assign");
  });

  it("never lets an admin act on an owner nor make one", () => {
    expect(allows("admin", "members.remove", { target: "member" })).toBe(true);
    expect(allows("admin", "members.remove", { target: "owner" })).toBe(false);
    expect(allows("admin", "members.set_role", { target: "viewer", nextRole: "admin" })).toBe(true);
    expect(allows("admin", "members.set_role", { target: "viewer", nextRole: "owner" })).toBe(false);
    expect(allows("owner", "members.set_role", { target: "owner", nextRole: "admin" })).toBe(true);
    expect(allows("member", "members.remove", { target: "viewer" })).toBe(false);
  });
});

describe("the hooks", () => {
  const org = (role: Role): OrgView => ({
    id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role, deletionPending: false, paidAccess: true,
  });
  const inOrg = (role: Role) => {
    const state: AppState = {
      me: { user: { id: "u_me", email: "me@smithlaw.com" }, organizations: [org(role)], platformAdmin: false },
      org: org(role), reload: () => {}, leave: () => {},
    };
    return ({ children }: { children: ReactNode }) => createElement(AppContext.Provider, { value: state }, children);
  };

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it("answers for the active role", () => {
    const viewer = renderHook(() => ({ pay: useCan("billing.manage"), read: useCan("org.read") }), { wrapper: inOrg("viewer") });
    expect(viewer.result.current).toEqual({ pay: false, read: true });

    const admin = renderHook(() => useAccess(), { wrapper: inOrg("admin") });
    expect(admin.result.current.role).toBe("admin");
    expect(admin.result.current.forbiddenShown).toBe(false);
    expect(admin.result.current.can("members.remove", { target: "owner" })).toBe(false);
    expect(admin.result.current.can("members.remove", { target: "member" })).toBe(true);
  });

  it("in mock, follows the switch as the panel flips it, without a reload", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    const { result } = renderHook(() => ({ pay: useCan("billing.manage"), overview: useOverviewVariant() }), {
      wrapper: inOrg("viewer"),
    });
    expect(result.current.pay).toBe(false);
    expect(result.current.overview.nextActions.checkboxes).toBe(false);

    act(() => setShowForbidden(true));
    expect(result.current.pay).toBe(true);
    expect(result.current.overview.nextActions.checkboxes).toBe(true);

    act(() => setShowForbidden(false));
    expect(result.current.pay).toBe(false);
  });

  it.each([undefined, "production", "live-debug"])("ignores the stored switch when the mode is %s", mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    sessionStorage.setItem("arca.debug.showForbidden", "1");
    const { result } = renderHook(() => ({ access: useAccess(), pay: useCan("billing.manage") }), { wrapper: inOrg("viewer") });

    expect(result.current.access.forbiddenShown).toBe(false);
    expect(result.current.pay).toBe(false);
  });
});
