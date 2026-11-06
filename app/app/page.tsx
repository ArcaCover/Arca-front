"use client";

import { Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight, BellRing, CalendarClock, ClipboardCheck, Download, FileText, Handshake, LifeBuoy, Plus, ShieldCheck, UserPlus,
  Users,
} from "lucide-react";
import type { ActionItemView } from "@arca/contracts";

import { useActions } from "@/components/app/ActionsState";
import AnalysisCard from "@/components/app/AnalysisCard";
import { useApp, useFailure } from "@/components/app/AppContext";
import { useSample } from "@/components/app/SampleState";
import { useAnalyses } from "@/components/app/useAnalyses";
import {
  Badge, Card, Dialog, EmptyState, PageHeader, Sparkline, StatCard, buttonClass, formatDate, usePreview, useToast,
} from "@/components/app/ui";
import { useCan, useOverviewVariant, type OverviewStat, type QuickAction } from "@/lib/app/access";
import { updateAction } from "@/lib/app/client";
import { ALERT_CATEGORY } from "@/lib/app/mock/alerts";
import { SAMPLE_BENCHMARK, SAMPLE_SCORE_HISTORY } from "@/lib/app/mock/records";
import { SAMPLE_TEAM } from "@/lib/app/mock/team";

const CALENDLY = "https://calendly.com/arcacover/discovery";

// A role gets two, three or four indicators (DN-11 §6.3); the row keeps them on one line from the width that fits them.
// Three on a phone would leave one alone in the second row, so the first one takes the whole first row.
const STAT_GRID: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3 [&>:first-child]:col-span-2 sm:[&>:first-child]:col-span-1",
  4: "grid-cols-2 lg:grid-cols-4",
};

function Overview() {
  const { me, org } = useApp();
  const paid = useSearchParams().get("paid") === "1";
  // The API decides who gets in: an unpaid organization answers 402 here and the page moves on to billing.
  const { analyses, error } = useAnalyses();
  const { alerts, unreadAlerts } = useSample();
  const { items, source, openCount, error: planError, refresh } = useActions();
  // What this role's Overview shows, card by card (DN-11 §6.3). Every way to /quote follows analysis.create.
  const { stats, quickActions, nextActions: next } = useOverviewVariant();
  const canRun = useCan("analysis.create");
  const fail = useFailure();
  const notify = useToast();
  const [broker, setBroker] = useState(false);
  const preview = usePreview();
  // A box stays ticked from the click until the plan is read again after its PATCH, and takes no second click meanwhile,
  // so a double click sends one change, not two that would each be audited. While the PATCH is on its way the box is
  // ticked by `inFlight`, whatever plan reads land; once answered, by `ticked`, until the next read replaces that plan.
  const [inFlight, setInFlight] = useState<ReadonlySet<string>>(() => new Set());
  const [ticked, setTicked] = useState<{ plan: ActionItemView[] | null; keys: ReadonlySet<string> }>(() => ({
    plan: null, keys: new Set(),
  }));
  // The same keys as inFlight, for a second click that comes before React renders the first.
  const sending = useRef(new Set<string>());
  // The plan as last read, which an answer that lands after a newer read must tick against.
  const lastPlan = useRef(items);
  useLayoutEffect(() => {
    lastPlan.current = items;
  }, [items]);
  const nextList = useRef<HTMLUListElement>(null);

  const latest = analyses?.[0] ?? null;
  const mine = (item: ActionItemView) => item.assignee?.userId === me.user.id;
  const open = (items ?? []).filter(item => item.status !== "done");
  const myOpen = items ? open.filter(mine).length : null;
  // A member's own actions come first; the rest keep the plan's order.
  const nextActions = (next.mineFirst ? [...open.filter(mine), ...open.filter(item => !mine(item))] : open).slice(0, 3);
  const done = (items ?? []).length - open.length;
  const recentAlerts = alerts.slice(0, 3);

  const isTicked = (key: string) => inFlight.has(key) || (ticked.plan === items && ticked.keys.has(key));

  async function markDone(item: ActionItemView) {
    const { key } = item;
    if (sending.current.has(key) || isTicked(key)) return;
    sending.current.add(key);
    setInFlight(current => new Set(current).add(key));
    try {
      await updateAction(org.id, key, { status: "done" });
      const plan = lastPlan.current;
      setTicked(current => ({ plan, keys: new Set(current.plan === plan ? current.keys : []).add(key) }));
      // The row leaves the list once the plan is read again, and its box with it: the focus waits on the list instead
      // of dropping to the page, and the toast says what happened.
      if (document.activeElement instanceof HTMLElement && document.activeElement.dataset.actionKey === key) {
        nextList.current?.focus();
      }
      notify(`“${item.title}” marked as done.`);
    } catch (cause) {
      const message = fail(cause);
      if (message) notify(message);
    } finally {
      sending.current.delete(key);
      setInFlight(current => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
    refresh();
  }

  function stat(kind: OverviewStat): ReactNode {
    switch (kind) {
      case "open_actions":
        return (
          <StatCard
            key={kind}
            icon={ClipboardCheck}
            sample={false}
            label="Open actions"
            value={openCount ?? "—"}
            hint={items ? `${done} done` : "In the action plan"}
            href="/app/action-plan"
          />
        );
      case "my_open_actions":
        return (
          <StatCard
            key={kind}
            icon={ClipboardCheck}
            sample={false}
            label="My open actions"
            value={myOpen ?? "—"}
            hint={openCount === null ? "Assigned to you" : `${openCount} open in the whole plan`}
            href="/app/action-plan"
          />
        );
      case "alerts":
        return <StatCard key={kind} icon={BellRing} label="Unread alerts" value={unreadAlerts} hint="From monitoring" href="/app/monitoring" />;
      case "members":
        return (
          <StatCard key={kind} icon={Users} label="Team members" value={SAMPLE_TEAM.length} hint="With access to this workspace" href="/app/members" />
        );
      case "coverage":
        return (
          <StatCard
            key={kind}
            icon={ShieldCheck}
            sample={false}
            label="Coverage"
            value="Not active"
            hint="ARCA does not bind policies yet"
            href="/app/coverage"
          />
        );
      default:
        // A new kind fails the typecheck here instead of rendering nothing.
        return kind satisfies never;
    }
  }

  function quickAction(kind: QuickAction): ReactNode {
    switch (kind) {
      case "invite":
        return <QuickLink key={kind} href="/app/members" icon={UserPlus} label="Invite a teammate" />;
      case "download_report":
        return (
          <li key={kind}>
            <button type="button" disabled className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-marino/50">
              <Download aria-hidden className="h-4 w-4" />
              <span className="flex-1">Download full report</span>
              <Badge>Coming soon</Badge>
            </button>
          </li>
        );
      case "broker":
        return (
          <li key={kind}>
            <button type="button" onClick={() => setBroker(true)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-bruma">
              <Handshake aria-hidden className="h-4 w-4" />
              <span className="flex-1">Talk to a broker</span>
              <ArrowRight aria-hidden className="h-4 w-4 text-marino/40" />
            </button>
          </li>
        );
      case "book_call":
        return (
          <li key={kind}>
            <a href={CALENDLY} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-bruma">
              <CalendarClock aria-hidden className="h-4 w-4" />
              <span className="flex-1">Book a call with ARCA</span>
              <ArrowRight aria-hidden className="h-4 w-4 text-marino/40" />
            </a>
          </li>
        );
      case "help":
        return <QuickLink key={kind} href="/app/help" icon={LifeBuoy} label="Help & support" />;
      default:
        return kind satisfies never;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Your AI risk at a glance"
        description={`Where ${org.name} stands today, what to fix next and what changed since the last scan.`}
        actions={
          canRun && (
            <Link href="/quote" className={buttonClass.secondary}>
              <Plus aria-hidden className="h-4 w-4" />
              Run a new analysis
            </Link>
          )
        }
      />
      {/* ?paid=1 only says the checkout came back; the payment counts once /me shows the organization paid. */}
      {paid && (
        <p className="mb-6 rounded-2xl bg-bruma p-4 text-sm">
          {org.paidAccess ? "Payment received. Your organization is active." : "Payment is being confirmed."}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}

      <section aria-label="Key figures" className={`grid gap-4 ${STAT_GRID[stats.length] ?? STAT_GRID[4]}`}>
        {stats.map(stat)}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {analyses === null ? (
            !error && (
              <p role="status" className="rounded-3xl border border-marino/10 bg-white p-6 text-sm text-marino/70">
                Loading analyses…
              </p>
            )
          ) : latest ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold">Latest analysis</h2>
                <div className="flex gap-2">
                  <Link href={`/app/analyses/${latest.scanId}`} className={buttonClass.secondary}>
                    View analysis
                  </Link>
                  {analyses.length > 1 && (
                    <Link href="/app/analyses" className={buttonClass.ghost}>
                      All {analyses.length} analyses
                    </Link>
                  )}
                </div>
              </div>
              <AnalysisCard analysis={latest} current={latest.scanId === source?.scanId} />
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No analyses saved yet."
              // Who runs them is said once, in Quick actions (DN-11 §6.1).
              description={
                canRun
                  ? "Run a scan of your firm and save the results here."
                  : `Analyses show here once they are saved to ${org.name}.`
              }
              action={
                canRun && (
                  <Link href="/quote" className={buttonClass.primary}>
                    Run a new analysis
                  </Link>
                )
              }
            />
          )}
        </div>

        <div className="space-y-6">
          <Card title="Quick actions">
            {canRun ? (
              <>
                <p className="text-sm text-marino/70">
                  Run a new scan and assessment. When the results are ready, save them to {org.name}.
                </p>
                <Link href="/quote" className={`${buttonClass.primary} mt-4 w-full`}>
                  <Plus aria-hidden className="h-4 w-4" />
                  Add an analysis
                </Link>
              </>
            ) : (
              <p className="text-sm text-marino/70">New analyses are run by an owner or admin of {org.name}.</p>
            )}
            <ul aria-label="Quick actions" className="mt-4 space-y-2 text-sm">
              {quickActions.map(quickAction)}
            </ul>
          </Card>
          <Card title="Benchmark" sample="illustrative">
            <p className="font-heading text-4xl font-semibold">
              {SAMPLE_BENCHMARK.percentile}
              <span className="text-lg text-marino/60">th percentile</span>
            </p>
            <p className="mt-2 text-sm text-marino/70">Among {SAMPLE_BENCHMARK.peers}.</p>
            <p className="mt-3 text-xs text-marino/60">Illustrative: not computed from real firms.</p>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Score trend"
          description="Monthly re-scans show whether the changes you make move the score."
          sample="illustrative"
        >
          <Sparkline points={SAMPLE_SCORE_HISTORY} label="Score over the last six months (sample)" />
        </Card>
        <Card
          title="Next actions"
          description={next.mineFirst ? "The ones assigned to you come first." : undefined}
          actions={
            <Link href="/app/action-plan" className="text-sm font-semibold underline-offset-4 hover:underline">
              View all
            </Link>
          }
        >
          <ul
            ref={nextList}
            tabIndex={-1}
            aria-label="Next actions"
            className="space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cielo"
          >
            {nextActions.map(item => (
              <li key={item.key} className="flex items-start gap-3">
                {next.checkboxes && (
                  // Ticked rather than disabled while it is sent, so the focus stays on it.
                  <input
                    type="checkbox"
                    checked={isTicked(item.key)}
                    aria-disabled={isTicked(item.key) || undefined}
                    aria-label={`Mark “${item.title}” as done`}
                    data-action-key={item.key}
                    onChange={() => void markDone(item)}
                    className="mt-1 h-4 w-4 accent-marino"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-marino/60">
                    {item.pointsGain !== null && `+${item.pointsGain} demo pts · `}
                    {mine(item) ? "Assigned to you" : (item.assignee?.email ?? "Unassigned")}
                    {item.dueDate && ` · due ${formatDate(item.dueDate)}`}
                  </p>
                </div>
              </li>
            ))}
            {items === null ? (
              <li className="text-sm text-marino/70">
                {planError ? "The action plan could not be loaded." : "Loading the action plan…"}
              </li>
            ) : (
              nextActions.length === 0 && (
                <li className="text-sm text-marino/70">{items.length ? "Every action is done." : "No actions yet."}</li>
              )
            )}
          </ul>
          {/* The plan tracks the work; the points only move once a new analysis measures it (DN-11 D16). */}
          {nextActions.length > 0 && (
            <p className="mt-4 text-xs text-marino/60">
              Marking an action done doesn&apos;t change your score. A new analysis updates the score.
            </p>
          )}
        </Card>
      </div>

      <Card
        className="mt-6"
        title="Monitoring"
        description="What changed in your firm and in the rules around AI since the last scan."
        sample
        actions={
          <Link href="/app/monitoring" className="text-sm font-semibold underline-offset-4 hover:underline">
            Open monitoring
          </Link>
        }
      >
        <ul aria-label="Recent alerts" className="divide-y divide-marino/10">
          {recentAlerts.map(alert => (
            <li key={alert.id} className="flex flex-wrap items-center gap-3 py-3">
              <Badge tone={alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warning" : "neutral"}>
                {ALERT_CATEGORY[alert.category]}
              </Badge>
              <p className={`min-w-0 flex-1 text-sm ${alert.read ? "text-marino/70" : "font-semibold"}`}>{alert.title}</p>
              <span className="text-xs text-marino/50">{formatDate(alert.at)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Dialog
        open={broker}
        onClose={() => setBroker(false)}
        title="Talk to a broker"
        description="Brokers are how most firms will buy ARCA coverage."
        footer={
          <>
            <button type="button" onClick={() => setBroker(false)} className={buttonClass.secondary}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setBroker(false);
                preview("Broker introductions start once ARCA has a carrier partner.");
              }}
              className={buttonClass.primary}
            >
              Request an introduction
            </button>
          </>
        }
      >
        <p>
          ARCA will connect you with a certified broker who already works with law firms. They receive your score and report so
          the conversation starts from your actual practices.
        </p>
      </Dialog>
    </>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-bruma">
        <Icon aria-hidden className="h-4 w-4" />
        <span className="flex-1">{label}</span>
        <ArrowRight aria-hidden className="h-4 w-4 text-marino/40" />
      </Link>
    </li>
  );
}

export default function AppHomePage() {
  return (
    <Suspense fallback={null}>
      <Overview />
    </Suspense>
  );
}
