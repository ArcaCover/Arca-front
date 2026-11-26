"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { MeResponse } from "@arca/contracts";

import { ActionsProvider } from "@/components/app/ActionsState";
import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { AppContext, activeOrg, type AppState } from "@/components/app/AppContext";
import { SampleStateProvider } from "@/components/app/SampleState";
import { OrgNotices, RoleGate } from "@/components/app/shell/OrgNotices";
import Sidebar from "@/components/app/shell/Sidebar";
import TopBar from "@/components/app/shell/TopBar";
import { ToastProvider } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { canOpen, useForbiddenShown } from "@/lib/app/access";
import { forgetSession, signOut } from "@/lib/app/auth";
import { getMe } from "@/lib/app/client";
import { currentAppSession, rememberOrg, watchSessionEnd } from "@/lib/app/session";

// Sign-in, sign-up, an invitation and the confirmation of a sign-in link (DN-13 §4.1) are where a visitor gets a session, so
// they are the only pages open without one.
const PUBLIC = ["/app/login", "/app/signup", "/app/invite/", "/app/auth/confirm"];
const isPublic = (pathname: string) => PUBLIC.some(path => pathname === path || pathname.startsWith(path));
// The ARCA staff page needs a session but no organization: a platform admin need not belong to one.
const STAFF = "/app/admin";

type State = { kind: "loading" } | { kind: "ready"; me: MeResponse } | { kind: "failed"; message: string };

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = isPublic(pathname);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [version, setVersion] = useState(0);
  // Re-picked when the user switches organization; the remembered one wins on the next load.
  const [picked, setPicked] = useState<string | null>(null);
  // The navigation panel below lg.
  const [menuOpen, setMenuOpen] = useState(false);
  const forbiddenShown = useForbiddenShown();

  const leave = useCallback(() => {
    void signOut();
    setState({ kind: "loading" });
    router.replace("/app/login");
  }, [router]);
  const reload = useCallback(() => setVersion(value => value + 1), []);

  // Asked again on every private page, so a payment or a new organization shows as soon as the user moves on. The session is
  // the Supabase client's with the real accounts (DN-13 §4.3), which may refresh it on the way, so it is read asynchronously.
  useEffect(() => {
    if (open) return;
    let cancelled = false;
    currentAppSession()
      .then(session => {
        if (cancelled) return;
        if (!session) {
          router.replace("/app/login");
          return;
        }
        return getMe().then(me => {
          if (!cancelled) setState({ kind: "ready", me });
        });
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

  // A real session can also end outside this page: a refresh token that stopped working, a sign-out in another tab. It is
  // already gone, so only what this browser keeps is forgotten; asking Supabase to sign out again would announce another end.
  useEffect(() => {
    if (open) return;
    return watchSessionEnd(() => {
      forgetSession();
      setState({ kind: "loading" });
      router.replace("/app/login");
    });
  }, [open, router]);

  const org = useMemo(() => {
    if (state.kind !== "ready") return null;
    const { organizations } = state.me;
    return organizations.find(candidate => candidate.id === picked) ?? activeOrg(organizations);
  }, [state, picked]);
  const context = useMemo<AppState | null>(
    () => (state.kind === "ready" && org ? { me: state.me, org, reload, leave } : null),
    [state, org, reload, leave],
  );

  if (open) return <Frame wide>{children}</Frame>;

  if (state.kind === "ready" && context) {
    const organization =
      state.me.organizations.length > 1 ? (
        <label className="flex items-center gap-2">
          <span className="sr-only">Organization</span>
          <select
            value={context.org.id}
            onChange={event => {
              rememberOrg(event.target.value);
              setPicked(event.target.value);
            }}
            className="max-w-[12rem] rounded-full border border-marino/20 bg-white px-3 py-1.5 font-semibold sm:max-w-xs"
          >
            {state.me.organizations.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="block truncate font-heading font-semibold">{context.org.name}</span>
      );
    return (
      <div
        style={{ "--app-top": debugStrip() ? "1.5rem" : "0px" } as CSSProperties}
        className={`min-h-screen bg-canvas text-marino${debugStrip() ? " pt-6" : ""}`}
      >
        <ToastProvider>
          {/* Keyed by organization: switching remounts the pages, the plan and the sample state, so nothing carries over. */}
          <AppContext.Provider key={context.org.id} value={context}>
            <ActionsProvider>
              <SampleStateProvider>
                <Sidebar
                  me={state.me}
                  org={context.org}
                  pathname={pathname}
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  onSignOut={leave}
                  top={debugStrip() ? "1.5rem" : "0px"}
                />
                <div className="lg:pl-64">
                  <TopBar organization={organization} onMenu={() => setMenuOpen(true)} top={debugStrip() ? "1.5rem" : "0px"} />
                  <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
                    <OrgNotices pathname={pathname} />
                    {/* A page the role does not open never mounts (DN-11 §6.1), unless the debug switch shows it. */}
                    {canOpen(context.org.role, pathname, forbiddenShown) ? children : <RoleGate pathname={pathname} />}
                  </main>
                </div>
              </SampleStateProvider>
            </ActionsProvider>
          </AppContext.Provider>
        </ToastProvider>
      </div>
    );
  }

  return (
    <Frame
      header={
        state.kind === "ready" && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
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
      ) : pathname === STAFF ? (
        children
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

// In the debug modes DebugRoot's strip is fixed over the top of the page: one text-xs line with py-1, 1.5rem tall.
// Without this room it covers the organization, the email and Sign out. Literal comparison, as DN-09 asks.
const debugStrip = () =>
  process.env.NEXT_PUBLIC_ARCA_MODE === "mock" || process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug";

/**
 * The plain frame of the loading and failed states and the staff page. `wide` is the public pages' (sign-in, sign-up, invitation):
 * the funnel's lit canvas and room for its two columns (FunnelFrame).
 */
function Frame({ header, wide = false, children }: { header?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`min-h-screen text-marino${wide ? " assessment-canvas" : ""}${debugStrip() ? " pt-6" : ""}`}>
      <header className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4${wide ? " mx-auto max-w-[1240px] sm:px-8 lg:px-12" : " border-b border-marino/10 bg-white"}`}>
        <Link href="/app" aria-label="Arca" className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino">
          <ArcaWordmark className="h-6 w-auto text-marino" />
        </Link>
        {header}
      </header>
      <main className={wide ? "mx-auto max-w-[1240px] px-5 pb-16 pt-4 sm:px-8 lg:px-12 lg:pt-8" : "mx-auto max-w-4xl px-6 py-10"}>{children}</main>
    </div>
  );
}
