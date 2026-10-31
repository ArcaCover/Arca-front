"use client";

import { useState } from "react";
import { BellOff, CalendarClock, RefreshCw } from "lucide-react";

import { useSample } from "@/components/app/SampleState";
import { SampleGate } from "@/components/app/shell/OrgNotices";
import {
  Badge, Card, Dialog, EmptyState, FilterPills, PageHeader, SampleBadge, buttonClass, formatDate, usePreview, useToast, type TabItem,
} from "@/components/app/ui";
import { ALERT_CATEGORY, ALERT_SEVERITY, type AlertCategory, type AlertSeverity } from "@/lib/app/mock/alerts";
import { NEXT_RESCAN } from "@/lib/app/mock/records";

type Filter = "all" | AlertCategory;

// High is the one level that is an alert in the brand's sense, so it alone takes rojo (CLAUDE.md §5).
const SEVERITY_TONE: Record<AlertSeverity, "danger" | "warning" | "neutral"> = { high: "danger", medium: "warning", info: "neutral" };

function Monitoring() {
  const { alerts, actions, unreadAlerts, dispatch } = useSample();
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const preview = usePreview();
  const notify = useToast();

  const pills: TabItem<Filter>[] = [
    { key: "all", label: "All", count: alerts.length },
    ...(Object.keys(ALERT_CATEGORY) as AlertCategory[]).map(key => ({
      key, label: ALERT_CATEGORY[key], count: alerts.filter(alert => alert.category === key).length,
    })),
  ];
  const visible = filter === "all" ? alerts : alerts.filter(alert => alert.category === filter);
  // Read from the live list, so the panel follows Mark as read and closes itself once the alert is dismissed.
  const selected = alerts.find(alert => alert.id === openId) ?? null;
  const planned = selected ? actions.some(item => item.id === `act_${selected.id}`) : false;
  const close = () => setOpenId(null);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Monitoring"
        description="What changed in your firm and in the rules around AI, between one scan and the next."
      />

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
          <button
            type="button"
            onClick={() => preview("Re-scans will run on their own schedule once monitoring is connected.")}
            className={buttonClass.secondary}
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Run re-scan now
          </button>
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
              <button
                type="button"
                disabled={planned}
                onClick={() => {
                  dispatch({ type: "action.from_alert", alert: selected });
                  notify("Added to the action plan preview.", "Find it under To do. Like the rest of the preview, it resets on reload.");
                  close();
                }}
                className={buttonClass.primary}
              >
                {planned ? "Already in the action plan" : "Create action"}
              </button>
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
          </div>
        )}
      </Dialog>
    </>
  );
}

export default function MonitoringPage() {
  return (
    <SampleGate feature="monitoring">
      <Monitoring />
    </SampleGate>
  );
}
