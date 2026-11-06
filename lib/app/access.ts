import { useCallback, useSyncExternalStore } from "react";
import { can, canManageMember, type Permission, type Role } from "@arca/contracts";

import { useApp } from "@/components/app/AppContext";
import { ADMIN_ITEM, HELP_ITEM, NAV_GROUPS, isCurrent, type NavItem } from "@/components/app/shell/nav";
import { showForbidden, subscribeShowForbidden } from "@/lib/debug/bridge";

// The one home of the webapp's view rules (DN-11 §6.1, §6.2): which pages a role opens, which sidebar items it sees, what
// its Overview shows and which controls it gets. What a role may not do is hidden in every mode, but the back is still
// the one that denies. The debug panel's switch (mock only, read through the bridge) brings everything back, so the demo
// can reach the back's 403: every rule below yields to it.

export type CanOptions = {
  /** The role of the member a control acts on; with it, canManageMember applies too. */
  target?: Role;
  /** The role that member would get. Leave it out when removing them. */
  nextRole?: Role;
};

/** The contract's rule for one control: the permission, and on a member's row the rule that an admin never acts on an owner. */
export function allows(role: Role, permission: Permission, { target, nextRole }: CanOptions = {}): boolean {
  return can(role, permission) && (target === undefined || canManageMember(role, target, nextRole));
}

// The pages a role does not open, with the permission each one takes. Every other private page opens for every role, and
// a read-only one hides its controls instead. Only the activity is denied by the back as well; the rest is the front's.
const PAGE_PERMISSION: { href: string; permission: Permission }[] = [{ href: "/app/activity", permission: "activity.read" }];

// Sidebar items a role does not see although it opens the page. Billing opens for everyone, read-only but for the owner,
// so an unpaid organization never leaves a member or a viewer without a way out (D10); only the owner and the admin
// list it. The other roles still reach it from the plan status at the foot of the sidebar.
const NAV_ROLES: Partial<Record<string, readonly Role[]>> = { "/app/billing": ["owner", "admin"] };

/** Whether a role opens a private page. Pages it does not know about are not the role's to refuse. */
export function canOpen(role: Role, pathname: string, forbiddenShown = false): boolean {
  if (forbiddenShown) return true;
  return PAGE_PERMISSION.every(page => !isCurrent(page.href, pathname) || can(role, page.permission));
}

// The sample invoices are for the people who run the organization (DN-11 §6.2). No permission of the contract covers
// reading them, so the rule is a list of roles.
const INVOICE_ROLES: readonly Role[] = ["owner", "admin"];

/** Whether a role sees the sample invoices on the billing page. */
export function seesSampleInvoices(role: Role, forbiddenShown = false): boolean {
  return forbiddenShown || INVOICE_ROLES.includes(role);
}

export type NavGroup = { label: string; items: NavItem[] };

/**
 * The sidebar a role gets, which is also what the top bar's search can find: the groups, without the ones left empty,
 * and the footer links. The platform admin link is not a role's: it follows `/me` and the switch leaves it alone, since
 * that page refuses anyone else without asking the API.
 */
export function navItems(
  role: Role,
  { platformAdmin = false, forbiddenShown = false }: { platformAdmin?: boolean; forbiddenShown?: boolean } = {},
): { groups: NavGroup[]; footer: NavItem[] } {
  const listed = (item: NavItem) => forbiddenShown || (canOpen(role, item.href) && (NAV_ROLES[item.href]?.includes(role) ?? true));
  const footer = [HELP_ITEM].filter(listed);
  if (platformAdmin) footer.push(ADMIN_ITEM);
  return {
    groups: NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(listed) })).filter(group => group.items.length > 0),
    footer,
  };
}

export type OverviewStat = "open_actions" | "my_open_actions" | "alerts" | "members" | "coverage";
export type QuickAction = "invite" | "download_report" | "broker" | "book_call" | "help";

/** What the Overview shows a role, card by card (DN-11 §6.3). The latest analysis, the trend and monitoring are everyone's. */
export type OverviewVariant = {
  /** The indicator cards, in order. */
  stats: OverviewStat[];
  /**
   * The quick actions listed, in order. "Add an analysis" is not one of them: every way to /quote follows
   * analysis.create (§6.2), which the Overview asks with useCan like the rest of the pages.
   */
  quickActions: QuickAction[];
  /** "Next actions": the user's own actions first, and whether each row has a box to mark it done. */
  nextActions: { mineFirst: boolean; checkboxes: boolean };
};

// §6.3 gives the owner and the admin all of them, help included.
const TEAM_QUICK_ACTIONS: QuickAction[] = ["invite", "download_report", "broker", "book_call", "help"];
const OVERVIEW: Record<Role, OverviewVariant> = {
  owner: {
    stats: ["open_actions", "alerts", "members", "coverage"],
    quickActions: TEAM_QUICK_ACTIONS,
    nextActions: { mineFirst: false, checkboxes: true },
  },
  admin: {
    stats: ["open_actions", "alerts", "members", "coverage"],
    quickActions: TEAM_QUICK_ACTIONS,
    nextActions: { mineFirst: false, checkboxes: true },
  },
  member: {
    stats: ["my_open_actions", "alerts", "coverage"],
    quickActions: ["book_call", "help"],
    nextActions: { mineFirst: true, checkboxes: true },
  },
  viewer: {
    stats: ["open_actions", "coverage"],
    quickActions: ["book_call"],
    nextActions: { mineFirst: false, checkboxes: false },
  },
};

/**
 * The Overview of a role. The switch brings back the controls the role lacks (every quick action, and the boxes), and
 * leaves the cards that only arrange what the role reads.
 */
export function overviewVariant(role: Role, forbiddenShown = false): OverviewVariant {
  const variant = OVERVIEW[role];
  if (!forbiddenShown) return variant;
  return {
    ...variant,
    quickActions: [...TEAM_QUICK_ACTIONS, ...variant.quickActions.filter(action => !TEAM_QUICK_ACTIONS.includes(action))],
    nextActions: { ...variant.nextActions, checkboxes: true },
  };
}

const serverSnapshot = () => false;

/** Whether the debug panel's switch is on. Always false outside mock, and false on the server and while hydrating. */
export function useForbiddenShown(): boolean {
  return useSyncExternalStore(subscribeShowForbidden, showForbidden, serverSnapshot);
}

/**
 * The signed-in user's access in the active organization: their role, whether the switch is on, and a check for any
 * control. Use it where the target changes from row to row; useCan covers a single control.
 */
export function useAccess(): {
  role: Role;
  forbiddenShown: boolean;
  can: (permission: Permission, options?: CanOptions) => boolean;
} {
  const { org } = useApp();
  const forbiddenShown = useForbiddenShown();
  const check = useCallback(
    (permission: Permission, options?: CanOptions) => forbiddenShown || allows(org.role, permission, options),
    [org.role, forbiddenShown],
  );
  return { role: org.role, forbiddenShown, can: check };
}

/** Whether the active role gets a control (DN-11 §6.1): can() and canManageMember() of the contract, or the switch. */
export function useCan(permission: Permission, options?: CanOptions): boolean {
  return useAccess().can(permission, options);
}

/** The active role's Overview. */
export function useOverviewVariant(): OverviewVariant {
  const { role, forbiddenShown } = useAccess();
  return overviewVariant(role, forbiddenShown);
}
