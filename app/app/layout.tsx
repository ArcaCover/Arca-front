"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { MeResponse } from "@arca/contracts";

import { AppContext, activeOrg, type AppState } from "@/components/app/AppContext";
import { ApiError } from "@/lib/api/client";
import { signOut } from "@/lib/app/auth";
import { getMe } from "@/lib/app/client";
import { loadAppSession, rememberOrg } from "@/lib/app/session";

// Sign-in, sign-up and an invitation are where a visitor gets a session, so they are the only pages open without one.
const PUBLIC = ["/app/login", "/app/signup", "/app/invite/"];
const isPublic = (pathname: string) => PUBLIC.some(path => pathname === path || pathname.startsWith(path));

type State = { kind: "loading" } | { kind: "ready"; me: MeResponse } | { kind: "failed"; message: string };

const NAV = [
  { href: "/app", label: "Analyses" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/members", label: "Members" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = isPublic(pathname);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [version, setVersion] = useState(0);
  // Re-picked when the user switches organization; the remembered one wins on the next load.
  const [picked, setPicked] = useState<string | null>(null);

  const leave = useCallback(() => {
    signOut();
    setState({ kind: "loading" });
    router.replace("/app/login");
  }, [router]);
  const reload = useCallback(() => setVersion(value => value + 1), []);

  // Asked again on every private page, so a payment or a new organization shows as soon as the user moves on.
  useEffect(() => {
    if (open) return;
    if (!loadAppSession()) {
      router.replace("/app/login");
      return;
    }
    let cancelled = false;
    getMe()
      .then(me => {
        if (!cancelled) setState({ kind: "ready", me });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.code === "unauthorized") leave();
        else setState({ kind: "failed", message: cause instanceof ApiError ? cause.message : "We could not load your account." });
      });
    return () => {
      cancelled = true;
    };
  }, [open, pathname, version, router, leave]);

  const org = useMemo(() => {
    if (state.kind !== "ready") return null;
    const { organizations } = state.me;
    return organizations.find(candidate => candidate.id === picked) ?? activeOrg(organizations);
  }, [state, picked]);
  const context = useMemo<AppState | null>(
    () => (state.kind === "ready" && org ? { me: state.me, org, reload, leave } : null),
    [state, org, reload, leave],
  );

  if (open) return <Frame>{children}</Frame>;

  return (
    <Frame
      header={
        state.kind === "ready" && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {org && state.me.organizations.length > 1 ? (
              <label className="flex items-center gap-2">
                <span className="sr-only">Organization</span>
                <select
                  value={org.id}
                  onChange={event => {
                    rememberOrg(event.target.value);
                    setPicked(event.target.value);
                  }}
                  className="rounded-full border border-marino/20 bg-white px-3 py-1.5"
                >
                  {state.me.organizations.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              org && <span className="font-semibold">{org.name}</span>
            )}
            <span className="text-marino/70">{state.me.user.email}</span>
            <button
              type="button"
              onClick={leave}
              className="inline-flex items-center gap-1.5 rounded-full border border-marino/20 px-3 py-1.5"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )
      }
    >
      {state.kind === "loading" ? (
        <p role="status" className="text-sm text-marino/70">
          Loading your account…
        </p>
      ) : state.kind === "failed" ? (
        <div>
          <p role="alert" className="text-sm text-rojo">
            {state.message}
          </p>
          <button type="button" onClick={reload} className="mt-4 rounded-full bg-oro px-4 py-2 text-sm font-semibold">
            Try again
          </button>
        </div>
      ) : context ? (
        <>
          <nav aria-label="App" className="mb-8 flex flex-wrap gap-2 text-sm">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="rounded-full border border-marino/15 bg-white px-3 py-1.5 aria-[current=page]:bg-marino aria-[current=page]:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <AppContext.Provider value={context}>{children}</AppContext.Provider>
        </>
      ) : (
        // Every account belongs to an organization once a claim succeeds; one that failed lands here (DN-10 §4.7).
        <section className="rounded-3xl bg-white p-6">
          <h1 className="font-heading text-xl">Complete an analysis to create your organization</h1>
          <p className="mt-2 text-sm text-marino/70">
            Your organization is created when you save the results of an analysis.
          </p>
          <Link href="/quote" className="mt-4 inline-flex rounded-full bg-oro px-4 py-2 text-sm font-semibold">
            Start an analysis
          </Link>
        </section>
      )}
    </Frame>
  );
}

function Frame({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen text-marino">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-marino/10 bg-white px-6 py-4">
        <Link href="/app" className="font-heading text-lg font-semibold">
          Arca
        </Link>
        {header}
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
