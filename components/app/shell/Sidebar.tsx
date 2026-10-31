"use client";

import Link from "next/link";
import { LogOut, ShieldHalf, X } from "lucide-react";
import type { MeResponse, OrgView } from "@arca/contracts";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { useSample } from "@/components/app/SampleState";
import { Avatar } from "@/components/app/ui";
import { HELP_ITEM, NAV_GROUPS, isCurrent, type NavItem } from "./nav";

const STATUS: Record<OrgView["billingStatus"], { label: string; tone: string }> = {
  active: { label: "Plan active", tone: "bg-cielo" },
  // Worded apart from Billing's own status line, which says "Pending payment" and "Past due".
  pending_payment: { label: "Awaiting payment", tone: "bg-oro" },
  past_due: { label: "Payment overdue", tone: "bg-oro" },
  canceled: { label: "Plan canceled", tone: "bg-marino/40" },
};

/**
 * The /app navigation. One element for every width (spec 2026-10-29 §7): fixed on the left from lg up, and a panel
 * that slides in below that. `top` leaves room for the debug strip when there is one.
 */
export default function Sidebar({
  me, org, pathname, open, onClose, onSignOut, top,
}: {
  me: MeResponse;
  org: OrgView;
  pathname: string;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  top: string;
}) {
  const { openActions, unreadAlerts } = useSample();
  const counters = { actions: openActions, alerts: unreadAlerts };
  const status = STATUS[org.billingStatus];

  const link = (item: NavItem) => {
    const current = isCurrent(item.href, pathname);
    const count = item.counter ? counters[item.counter] : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onClose}
          aria-current={current ? "page" : undefined}
          className="group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-marino/75 transition-colors hover:bg-marino/5 hover:text-marino aria-[current=page]:bg-marino aria-[current=page]:font-semibold aria-[current=page]:text-white"
        >
          <item.icon aria-hidden className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {count > 0 && (
            <span className="rounded-full bg-oro px-1.5 text-[11px] font-bold text-marino" aria-label={`${count} sample items`}>
              {count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {open && <div aria-hidden className="fixed inset-0 z-30 bg-marino/40 lg:hidden" onClick={onClose} />}
      <aside
        aria-label="Workspace navigation"
        style={{ top }}
        className={`fixed bottom-0 left-0 z-40 flex w-64 flex-col border-r border-marino/10 bg-white transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <Link href="/app" onClick={onClose} aria-label="Arca workspace home">
            <ArcaWordmark className="h-6 w-auto text-marino" />
          </Link>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-full p-1.5 hover:bg-marino/5 lg:hidden">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="App" className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-marino/45">{group.label}</p>
              <ul className="space-y-0.5">{group.items.map(link)}</ul>
            </div>
          ))}
          <ul className="space-y-0.5 border-t border-marino/10 pt-4">
            {link(HELP_ITEM)}
            {me.platformAdmin &&
              link({ href: "/app/admin", label: "Platform admin", icon: ShieldHalf })}
          </ul>
        </nav>
        <div className="space-y-3 border-t border-marino/10 p-4">
          <Link href="/app/billing" onClick={onClose} className="flex items-center gap-2 rounded-2xl bg-bruma/60 px-3 py-2 text-xs">
            <span aria-hidden className={`h-2 w-2 rounded-full ${status.tone}`} />
            <span className="flex-1 font-semibold">{status.label}</span>
            {org.deletionPending && <span className="text-marino/70">Deletion requested</span>}
          </Link>
          <div className="flex items-center gap-3">
            <Avatar name={me.user.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{me.user.email}</p>
              <p className="text-xs capitalize text-marino/60">{org.role}</p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-marino/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-marino/5"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
