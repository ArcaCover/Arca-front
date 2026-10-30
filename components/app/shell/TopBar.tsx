"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Plus, Search } from "lucide-react";

import { useSample } from "@/components/app/SampleState";
import { Badge, buttonClass, formatDate } from "@/components/app/ui";
import { ALERT_SEVERITY } from "@/lib/app/mock/alerts";
import { SAMPLE_TEMPLATES } from "@/lib/app/mock/records";
import { HELP_ITEM, NAV_GROUPS } from "./nav";

/** The bar above every private page: navigation toggle, organization, search, new analysis and notifications. */
export default function TopBar({ organization, onMenu, top }: { organization: ReactNode; onMenu: () => void; top: string }) {
  return (
    <div
      style={{ top }}
      className="sticky z-20 flex items-center gap-3 border-b border-marino/10 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-10"
    >
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="rounded-full p-2 hover:bg-marino/5 lg:hidden">
        <Menu aria-hidden className="h-5 w-5" />
      </button>
      <div className="min-w-0 shrink text-sm">{organization}</div>
      <div className="ml-auto flex items-center gap-2">
        <WorkspaceSearch />
        <Link href="/quote" className={`${buttonClass.primary} hidden sm:inline-flex`}>
          <Plus aria-hidden className="h-4 w-4" />
          New analysis
        </Link>
        <Notifications />
      </div>
    </div>
  );
}

type Result = { label: string; href: string; group: string };

/** Searches a fixed list of pages and sample items in the browser (spec 2026-10-29 §5). Enter opens the first match. */
function WorkspaceSearch() {
  const router = useRouter();
  const { actions, alerts } = useSample();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const index = useMemo<Result[]>(
    () => [
      ...[...NAV_GROUPS.flatMap(group => group.items), HELP_ITEM].map(item => ({ label: item.label, href: item.href, group: "Pages" })),
      ...actions.map(item => ({ label: item.title, href: "/app/action-plan", group: "Action plan" })),
      ...alerts.map(alert => ({ label: alert.title, href: "/app/monitoring", group: "Monitoring" })),
      ...SAMPLE_TEMPLATES.map(doc => ({ label: doc.name, href: "/app/documents", group: "Documents" })),
    ],
    [actions, alerts],
  );
  const term = query.trim().toLowerCase();
  const results = term ? index.filter(item => item.label.toLowerCase().includes(term)).slice(0, 8) : [];

  function go(href: string) {
    setQuery("");
    setFocused(false);
    router.push(href);
  }

  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-full border border-marino/15 bg-white px-3 py-1.5 text-sm focus-within:border-cielo">
        <Search aria-hidden className="h-4 w-4 text-marino/50" />
        <span className="sr-only">Search the workspace</span>
        <input
          type="search"
          value={query}
          placeholder="Search"
          onChange={event => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={event => {
            if (event.key === "Enter" && results[0]) go(results[0].href);
            if (event.key === "Escape") setQuery("");
          }}
          className="w-24 bg-transparent outline-none placeholder:text-marino/45 sm:w-44"
        />
      </label>
      {focused && term && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-marino/10 bg-white p-2 shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-marino/60">No matches for “{query.trim()}”.</p>
          ) : (
            <ul aria-label="Search results">
              {results.map(result => (
                <li key={`${result.group}-${result.label}`}>
                  <button
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => go(result.href)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-bruma"
                  >
                    <span className="truncate">{result.label}</span>
                    <span className="shrink-0 text-[11px] text-marino/50">{result.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** The bell: sample alerts, a read-all button and a link to Monitoring. Closes on Escape or a click outside. */
function Notifications() {
  const { alerts, unreadAlerts, dispatch } = useSample();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={unreadAlerts ? `Notifications, ${unreadAlerts} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="relative rounded-full border border-marino/15 bg-white p-2 hover:bg-marino/5"
      >
        <Bell aria-hidden className="h-4 w-4" />
        {unreadAlerts > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-oro px-1 text-[10px] font-bold">
            {unreadAlerts}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-marino/10 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-marino/10 px-4 py-3">
            <p className="font-heading font-semibold">Notifications</p>
            <span className="text-[11px] text-marino/55">Sample data</span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {alerts.slice(0, 5).map(alert => (
              <li key={alert.id} className="border-b border-marino/5 px-4 py-3 last:border-0">
                <div className="flex items-center gap-2">
                  {!alert.read && (
                    <>
                      <span aria-hidden className="h-2 w-2 rounded-full bg-oro" />
                      <span className="sr-only">Unread</span>
                    </>
                  )}
                  <Badge tone={alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warning" : "neutral"}>
                    {ALERT_SEVERITY[alert.severity]}
                  </Badge>
                  <span className="text-[11px] text-marino/50">{formatDate(alert.at)}</span>
                </div>
                <p className="mt-1 text-sm">{alert.title}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <button type="button" onClick={() => dispatch({ type: "alert.read_all" })} className="font-semibold text-marino/75 hover:text-marino">
              Mark all as read
            </button>
            <Link href="/app/monitoring" onClick={() => setOpen(false)} className="font-semibold underline-offset-4 hover:underline">
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
