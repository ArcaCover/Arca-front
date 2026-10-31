"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight, BellRing, CalendarClock, ClipboardCheck, Download, FileText, Handshake, Plus, ShieldCheck, UserPlus, Users,
} from "lucide-react";

import AnalysisCard from "@/components/app/AnalysisCard";
import { useApp } from "@/components/app/AppContext";
import { useSample } from "@/components/app/SampleState";
import { useAnalyses } from "@/components/app/useAnalyses";
import {
  Badge, Card, Dialog, EmptyState, PageHeader, Sparkline, StatCard, buttonClass, formatDate, usePreview,
} from "@/components/app/ui";
import { ALERT_CATEGORY } from "@/lib/app/mock/alerts";
import { SAMPLE_BENCHMARK, SAMPLE_SCORE_HISTORY } from "@/lib/app/mock/records";
import { SAMPLE_TEAM, teammate } from "@/lib/app/mock/team";

const CALENDLY = "https://calendly.com/arcacover/discovery";

function Overview() {
  const { org } = useApp();
  const paid = useSearchParams().get("paid") === "1";
  // The API decides who gets in: an unpaid organization answers 402 here and the page moves on to billing.
  const { analyses, error } = useAnalyses();
  const { actions, alerts, openActions, unreadAlerts, dispatch } = useSample();
  const [broker, setBroker] = useState(false);
  const preview = usePreview();

  const latest = analyses?.[0] ?? null;
  const nextActions = actions.filter(item => item.status !== "done").slice(0, 3);
  const recentAlerts = alerts.slice(0, 3);
  const done = actions.filter(item => item.status === "done").length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Your AI risk at a glance"
        description={`Where ${org.name} stands today, what to fix next and what changed since the last scan.`}
        actions={
          <Link href="/quote" className={buttonClass.secondary}>
            <Plus aria-hidden className="h-4 w-4" />
            Run a new analysis
          </Link>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} label="Open actions" value={openActions} hint={`${done} done`} href="/app/action-plan" />
        <StatCard icon={BellRing} label="Unread alerts" value={unreadAlerts} hint="From monitoring" href="/app/monitoring" />
        <StatCard icon={Users} label="Team members" value={SAMPLE_TEAM.length} hint="With access to this workspace" href="/app/members" />
        <StatCard
          icon={ShieldCheck}
          sample={false}
          label="Coverage"
          value="Not active"
          hint="ARCA does not bind policies yet"
          href="/app/coverage"
        />
      </div>

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
              <AnalysisCard analysis={latest} />
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No analyses saved yet."
              description="Run a scan of your firm and save the results here."
              action={
                <Link href="/quote" className={buttonClass.primary}>
                  Run a new analysis
                </Link>
              }
            />
          )}
        </div>

        <div className="space-y-6">
          <Card title="Quick actions">
            <p className="text-sm text-marino/70">
              Run a new scan and assessment. When the results are ready, save them to {org.name}.
            </p>
            <Link href="/quote" className={`${buttonClass.primary} mt-4 w-full`}>
              <Plus aria-hidden className="h-4 w-4" />
              Add an analysis
            </Link>
            <ul className="mt-4 space-y-2 text-sm">
              <QuickLink href="/app/members" icon={UserPlus} label="Invite a teammate" />
              <li>
                <button type="button" disabled className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-marino/50">
                  <Download aria-hidden className="h-4 w-4" />
                  <span className="flex-1">Download full report</span>
                  <Badge>Coming soon</Badge>
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setBroker(true)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-bruma">
                  <Handshake aria-hidden className="h-4 w-4" />
                  <span className="flex-1">Talk to a broker</span>
                  <ArrowRight aria-hidden className="h-4 w-4 text-marino/40" />
                </button>
              </li>
              <li>
                <a href={CALENDLY} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-bruma">
                  <CalendarClock aria-hidden className="h-4 w-4" />
                  <span className="flex-1">Book a call with ARCA</span>
                  <ArrowRight aria-hidden className="h-4 w-4 text-marino/40" />
                </a>
              </li>
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
          sample
          actions={
            <Link href="/app/action-plan" className="text-sm font-semibold underline-offset-4 hover:underline">
              View all
            </Link>
          }
        >
          <ul aria-label="Next actions" className="space-y-3">
            {nextActions.map(item => (
              <li key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Mark “${item.title}” as done`}
                  onChange={() => dispatch({ type: "action.status", id: item.id, status: "done" })}
                  className="mt-1 h-4 w-4 accent-marino"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-marino/60">
                    +{item.points} pts · {teammate(item.assignee)?.name ?? "Unassigned"}
                    {item.due && ` · due ${formatDate(item.due)}`}
                  </p>
                </div>
              </li>
            ))}
            {nextActions.length === 0 && <li className="text-sm text-marino/70">Every action is done.</li>}
          </ul>
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
