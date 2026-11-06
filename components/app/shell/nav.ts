import {
  Activity, BellRing, ClipboardCheck, CreditCard, FileText, FolderOpen, LayoutDashboard, LifeBuoy, Settings, ShieldCheck,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Activity;
  /** Which sample counter shows next to it. */
  counter?: "actions" | "alerts";
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/app", label: "Overview", icon: LayoutDashboard },
      { href: "/app/analyses", label: "Analyses", icon: FileText },
      { href: "/app/action-plan", label: "Action plan", icon: ClipboardCheck, counter: "actions" },
      { href: "/app/monitoring", label: "Monitoring", icon: BellRing, counter: "alerts" },
      { href: "/app/coverage", label: "Coverage", icon: ShieldCheck },
      { href: "/app/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/app/members", label: "Members", icon: Users },
      { href: "/app/billing", label: "Billing", icon: CreditCard },
      { href: "/app/settings", label: "Settings", icon: Settings },
      { href: "/app/activity", label: "Activity", icon: Activity },
    ],
  },
];

export const HELP_ITEM: NavItem = { href: "/app/help", label: "Help & support", icon: LifeBuoy };

/** Overview only on /app itself; every other item also on the pages below it (an analysis under Analyses). */
export function isCurrent(href: string, pathname: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
