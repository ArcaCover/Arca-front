"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellOff, CalendarClock, RefreshCw } from "lucide-react";

import { useActions } from "@/components/app/ActionsState";
import { NewActionDialog } from "@/components/app/NewActionDialog";
import { useSample } from "@/components/app/SampleState";
import { SampleGate } from "@/components/app/shell/OrgNotices";
import {
  Badge, Card, Dialog, EmptyState, FilterPills, LoadFailed, PageHeader, ReadOnlyNotice, SampleBadge, buttonClass, formatDate,
  usePreview, useToast, type TabItem,
} from "@/components/app/ui";
import { useCan } from "@/lib/app/access";
import {
  ALERT_CATEGORY, ALERT_SEVERITY, type AlertCategory, type AlertSeverity, type SampleAlert,
} from "@/lib/app/mock/alerts";
import { NEXT_RESCAN } from "@/lib/app/mock/records";

type Filter = "all" | AlertCategory;

// High is the one level that is an alert in the brand's sense, so it alone takes rojo (CLAUDE.md §5).
const SEVERITY_TONE: Record<AlertSeverity, "danger" | "warning" | "neutral"> = { high: "danger", medium: "warning", info: "neutral" };

// The alerts are sample data and the plan is real, so "already in the plan" can only mean an action with the suggested text.
const comparable = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

function Monitoring() {
  const { alerts, unreadAlerts, dispatch } = useSample();
  const { items, error: planError, refresh } = useActions();
  // Acting on an alert is the team's (DN-11 §6.2): Create action and Dismiss follow actions.assign, and a re-scan is a new
  // analysis. Mark as read is personal, so everyone has it.
  const canAct = useCan("actions.assign");
  const canRescan = useCan("analysis.create");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<SampleAlert | null>(null);
  // Stable, so the drawer and the form keep the focus while the page re-renders under them.
  const close = useCallback(() => setOpenId(null), []);
  const closeCreating = useCallback(() => setCreating(null), []);
  const preview = usePreview();
  const notify = useToast();
  // The drawer's way into the plan, whichever the plan allows.
  const createButton = useRef<HTMLButtonElement>(null);
  const planLink = useRef<HTMLAnchorElement>(null);

  // A plan read that lands while the focus is on the page, not in the open drawer, moves it to the control the plan
  // unblocks. Mostly that is Try again's read, whose button leaves with the failure; but any read does it, for instance
  // after Mark as read was disabled under the focus.
  useEffect(() => {
    if (items === null || document.activeElement !== document.body) return;
    (createButton.current ?? planLink.current)?.focus();
  }, [items]);

  const planned = useMemo(() => new Set((items ?? []).map(item => comparable(item.title))), [items]);
  const inPlan = (alert: SampleAlert) => planned.has(comparable(alert.suggestedAction));

  const pills: TabItem<Filter>[] = [
    { key: "all", label: "All", count: alerts.length },
    ...(Object.keys(ALERT_CATEGORY) as AlertCategory[]).map(key => ({
      key, label: ALERT_CATEGORY[key], count: alerts.filter(alert => alert.category === key).length,
    })),
  ];
  const visible = filter === "all" ? alerts : alerts.filter(alert => alert.category === filter);
  // Read from the live list, so the panel follows Mark as read and closes itself once the alert is dismissed.
  const selected = alerts.find(alert => alert.id === openId) ?? null;

  return (
    <>
      {!canAct && (
        <ReadOnlyNotice>
          You can read every alert and mark it as read. Ask an owner or admin to turn one into an action or dismiss it.
        </ReadOnlyNotice>
      )}

      <Card title="Monthly re-scan" sample>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-3 text-sm">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-bruma">
              <CalendarClock aria-hidden className="h-4 w-4" />
            </span>
            <span>
              Monthly re-scan · next on <span className="font-semibold">{formatDate(NEXT_RESCAN)}</span>
            </span>
          </p>
          {canRescan && (
            <button
              type="button"
              onClick={() => preview("Re-scans will run on their own schedule once monitoring is connected.")}
              className={buttonClass.secondary}
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              Run re-scan now
            </button>
          )}
        </div>
      </Card>

      <Card
        className="mt-6"
        title="Alerts"
        description={unreadAlerts ? `${unreadAlerts} unread` : "Everything is read."}
        sample
        actions={
          <button
            type="button"
            disabled={unreadAlerts === 0}
            onClick={() => dispatch({ type: "alert.read_all" })}
            className={buttonClass.ghost}
          >
            Mark all as read
          </button>
        }
      >
        <FilterPills items={pills} active={filter} onChange={setFilter} label="Filter alerts" />
        {visible.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={BellOff} title="No alerts here." description="New ones appear after each re-scan." />
          </div>
        ) : (
          <ul aria-label="Alerts" className="mt-4 divide-y divide-marino/10">
            {visible.map(alert => (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(alert.id)}
                  className="flex w-full flex-wrap items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-bruma/60"
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${alert.read ? "bg-transparent" : "bg-cielo"}`}
                  />
                  <Badge tone={SEVERITY_TONE[alert.severity]}>{ALERT_SEVERITY[alert.severity]}</Badge>
                  <Badge>{ALERT_CATEGORY[alert.category]}</Badge>
                  <span className={`min-w-0 flex-1 text-sm ${alert.read ? "text-marino/70" : "font-semibold"}`}>
                    {alert.title}
                    {!alert.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  {inPlan(alert) && <Badge tone="success">In the action plan</Badge>}
                  <span className="text-xs text-marino/55">{formatDate(alert.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={selected !== null}
        onClose={close}
        variant="drawer"
        title={selected?.title ?? ""}
        description={
          selected && `${ALERT_CATEGORY[selected.category]} · ${ALERT_SEVERITY[selected.severity]} · ${formatDate(selected.at)}`
        }
        footer={
          selected && (
            <>
              <button
                type="button"
                disabled={selected.read}
                onClick={() => dispatch({ type: "alert.read", id: selected.id })}
                className={buttonClass.secondary}
              >
                Mark as read
              </button>
              {canAct && (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "alert.dismiss", id: selected.id });
                    close();
                  }}
                  className={buttonClass.secondary}
                >
                  Dismiss
                </button>
              )}
              {inPlan(selected) ? (
                <Link ref={planLink} href="/app/action-plan" className={buttonClass.secondary}>
                  Already in the action plan
                </Link>
              ) : (
                canAct && (
                  // D17: the alert is a sample, so its suggestion only fills the form; the action is real once confirmed.
                  // Until the plan is read, nobody knows whether the suggestion is in it already, so it waits.
                  <button
                    ref={createButton}
                    type="button"
                    disabled={items === null}
                    onClick={() => {
                      setCreating(selected);
                      close();
                    }}
                    className={buttonClass.primary}
                  >
                    Create action
                  </button>
                )
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={SEVERITY_TONE[selected.severity]}>{ALERT_SEVERITY[selected.severity]}</Badge>
              <SampleBadge />
            </div>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-marino/55">What happened</h3>
              <p className="mt-1">{selected.summary}</p>
            </section>
            <section className="rounded-2xl bg-bruma p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-marino/55">Suggested action</h3>
              <p className="mt-1 font-semibold">{selected.suggestedAction}</p>
            </section>
            {canAct &&
              items === null &&
              (planError ? (
                <LoadFailed
                  message="The action plan could not be loaded, so this alert cannot become an action yet."
                  onRetry={refresh}
                />
              ) : (
                <p role="status" className="text-sm text-marino/70">
                  Loading the action plan…
                </p>
              ))}
          </div>
        )}
      </Dialog>

      <NewActionDialog
        open={creating !== null}
        onClose={closeCreating}
        title={creating?.suggestedAction}
        description="The suggestion comes from a sample alert. Edit it as you need: what you add here is a real action in your plan."
        onCreated={() => {
          if (creating) dispatch({ type: "alert.read", id: creating.id });
          setCreating(null);
          refresh();
          notify("Action added to the plan.");
        }}
      />
    </>
  );
}

export default function MonitoringPage() {
  // The title stays over the locked state too, so the page keeps its h1 (as Coverage and Documents do).
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Monitoring"
        description="What changed in your firm and in the rules around AI, between one scan and the next."
      />
      <SampleGate feature="monitoring">
        <Monitoring />
      </SampleGate>
    </>
  );
}
