"use client";

import { useState } from "react";
import { Download, History } from "lucide-react";

import { SampleGate } from "@/components/app/shell/OrgNotices";
import {
  Avatar, Badge, Card, EmptyState, FilterPills, PageHeader, buttonClass, formatDate, inputClass, type TabItem,
} from "@/components/app/ui";
import { daysAgo } from "@/lib/app/mock/dates";
import { ACTIVITY_KIND, SAMPLE_ACTIVITY, type ActivityKind, type SampleActivity } from "@/lib/app/mock/records";

type KindFilter = "all" | ActivityKind;

const EVERYONE = "__everyone";
const SOURCE = { web: "Web", invite: "Invite", system: "System" } as const;
const ACTORS = [...new Set(SAMPLE_ACTIVITY.map(event => event.actor))];

const dayKey = (iso: string) => iso.slice(0, 10);
const TODAY = dayKey(daysAgo(0));
const YESTERDAY = dayKey(daysAgo(1));
const dayLabel = (key: string, iso: string) => (key === TODAY ? "Today" : key === YESTERDAY ? "Yesterday" : formatDate(iso));

function Activity() {
  const [person, setPerson] = useState(EVERYONE);
  const [kind, setKind] = useState<KindFilter>("all");

  const byPerson = person === EVERYONE ? SAMPLE_ACTIVITY : SAMPLE_ACTIVITY.filter(event => event.actor === person);
  const visible = kind === "all" ? byPerson : byPerson.filter(event => event.kind === kind);
  // Counts follow the person filter, so each pill says what pressing it would show.
  const pills: TabItem<KindFilter>[] = [
    { key: "all", label: "All", count: byPerson.length },
    ...(Object.keys(ACTIVITY_KIND) as ActivityKind[]).map(key => ({
      key, label: ACTIVITY_KIND[key], count: byPerson.filter(event => event.kind === key).length,
    })),
  ];

  // The sample is already newest first, so grouping keeps that order.
  const days: { key: string; label: string; events: SampleActivity[] }[] = [];
  for (const event of visible) {
    const key = dayKey(event.at);
    const last = days[days.length - 1];
    if (last?.key === key) last.events.push(event);
    else days.push({ key, label: dayLabel(key, event.at), events: [event] });
  }

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Activity"
        description="Who did what in your workspace, when, and from where."
        actions={
          <button type="button" disabled className={buttonClass.secondary}>
            <Download aria-hidden className="h-4 w-4" />
            Export CSV
            <Badge>Coming soon</Badge>
          </button>
        }
      />

      <Card title="Activity log" sample>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="font-semibold">Filter by person</span>
            <select value={person} onChange={event => setPerson(event.target.value)} className={inputClass}>
              <option value={EVERYONE}>Everyone</option>
              {ACTORS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <FilterPills items={pills} active={kind} onChange={setKind} label="Filter by kind" />
        </div>

        {days.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={History} title="No activity matches these filters." />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {days.map(day => (
              <section key={day.key} aria-label={day.label}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-marino/55">{day.label}</h3>
                <ol className="mt-3 space-y-4 border-l border-marino/10 pl-5">
                  {day.events.map(event => (
                    <li key={event.id} className="relative flex items-start gap-3">
                      <span aria-hidden className="absolute -left-[25px] top-3 h-2 w-2 rounded-full bg-cielo" />
                      <Avatar name={event.actor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{event.actor}</span> {event.text}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-marino/60">
                          <Badge>{ACTIVITY_KIND[event.kind]}</Badge>
                          <span>via {SOURCE[event.source]}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

export default function ActivityPage() {
  return (
    <SampleGate feature="the activity log">
      <Activity />
    </SampleGate>
  );
}
