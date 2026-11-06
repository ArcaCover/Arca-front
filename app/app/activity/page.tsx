"use client";

import { useEffect, useState } from "react";
import { Download, History } from "lucide-react";
import type { ActivityEventView } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import {
  Avatar, Badge, Card, EmptyState, FilterPills, PageHeader, buttonClass, formatDate, inputClass, type TabItem,
} from "@/components/app/ui";
import { listActivity } from "@/lib/app/client";
import { ACTOR_KIND_LABEL } from "@/lib/app/labels";

import { EVENT_KINDS, describeAction, describeChange, formatTime, type EventKind } from "./events";
import { FailureNote, ReadFailed, refusalOf, type Failure } from "./ReadFailed";

// The organization's real activity (DN-11 §4.3, §6.4), read from its audit log a page at a time. It takes activity.read
// and no payment (D5): the layout keeps it from the other roles, and an owner keeps the trail even unpaid.

type KindFilter = "all" | EventKind;
type Log = { events: ActivityEventView[]; nextBefore: number | null };

const EVERYONE = "__everyone";

/** Who acted, as the page names them. ARCA staff and the system carry no email (DN-11 §4.3), so none can show. */
function actorOf({ actor }: ActivityEventView): { key: string; name: string } {
  if (actor.kind === "arca") return { key: "arca", name: ACTOR_KIND_LABEL.platform };
  if (actor.kind === "system") return { key: "system", name: ACTOR_KIND_LABEL.system };
  // A member whose profile is gone has no email left.
  return actor.email ? { key: `member:${actor.email}`, name: actor.email } : { key: "member", name: "A member" };
}

/** useFailure gives no message for a 402 or a refused session, which move the page on: nothing to show for them here. */
const failed = (message: string | null, cause: unknown): Failure | null => (message === null ? null : { message, cause });

// Days are UTC, like every date in /app, and the back's timestamps are UTC too.
const dayKey = (iso: string) => iso.slice(0, 10);
function dayLabel(iso: string): string {
  const key = dayKey(iso);
  const now = Date.now();
  if (key === dayKey(new Date(now).toISOString())) return "Today";
  if (key === dayKey(new Date(now - 86_400_000).toISOString())) return "Yesterday";
  return formatDate(iso);
}

export default function ActivityPage() {
  const { org } = useApp();
  const fail = useFailure();
  const [log, setLog] = useState<Log | null>(null);
  // Why the first page, or the last Load more, could not be read.
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [person, setPerson] = useState(EVERYONE);
  const [kind, setKind] = useState<KindFilter>("all");
  // Bumped by Try again, so a first page that failed is asked for again without leaving the page.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listActivity(org.id)
      .then(page => {
        if (!cancelled) setLog(page);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setFailure(failed(fail(cause), cause));
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, fail, attempt]);

  function retry() {
    setFailure(null);
    setAttempt(value => value + 1);
  }

  async function loadMore(before: number) {
    setFailure(null);
    setLoadingMore(true);
    try {
      const page = await listActivity(org.id, { before });
      setLog(current => current && { events: [...current.events, ...page.events], nextBefore: page.nextBefore });
    } catch (cause) {
      setFailure(failed(fail(cause), cause));
    } finally {
      setLoadingMore(false);
    }
  }

  const header = (
    <PageHeader
      eyebrow="Organization"
      title="Activity"
      description="Who did what in your organization, newest first. Owners and admins see it."
      actions={
        <button type="button" disabled className={buttonClass.secondary}>
          <Download aria-hidden className="h-4 w-4" />
          Export CSV
          <Badge>Coming soon</Badge>
        </button>
      }
    />
  );

  if (!log) {
    return (
      <>
        {header}
        {failure ? (
          <ReadFailed failure={failure} onRetry={retry} />
        ) : (
          <p role="status" className="text-sm text-marino/70">
            Loading activity…
          </p>
        )}
      </>
    );
  }

  const rows = log.events.map(event => ({
    event,
    actor: actorOf(event),
    ...describeAction(event.action, event.targetLabel, { member: event.actor.kind === "member", email: event.actor.email }),
  }));
  const people = [...new Map(rows.map(({ actor }) => [actor.key, actor.name])).entries()];
  const byPerson = person === EVERYONE ? rows : rows.filter(row => row.actor.key === person);
  const visible = kind === "all" ? byPerson : byPerson.filter(row => row.kind === kind);
  // Counts follow the person filter, so each pill says what pressing it would show. Other appears only when it has events.
  const kinds = (Object.keys(EVENT_KINDS) as EventKind[]).filter(key => key !== "other" || rows.some(row => row.kind === key));
  const pills: TabItem<KindFilter>[] = [
    { key: "all", label: "All", count: byPerson.length },
    ...kinds.map(key => ({ key, label: EVENT_KINDS[key], count: byPerson.filter(row => row.kind === key).length })),
  ];

  const next = log.nextBefore;
  // A later page the back refused would be refused again, so Load more goes and the note says why.
  const refused = refusalOf(failure?.cause) !== undefined;
  // The page arrives newest first, so grouping keeps that order.
  const days: { key: string; label: string; rows: typeof rows }[] = [];
  for (const row of visible) {
    const key = dayKey(row.event.at);
    const last = days[days.length - 1];
    if (last?.key === key) last.rows.push(row);
    else days.push({ key, label: dayLabel(row.event.at), rows: [row] });
  }

  return (
    <>
      {header}
      <Card title="Activity log">
        {rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet."
            description="Changes to members, analyses and the action plan show here."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm">
                <span className="font-semibold">Filter by person</span>
                <select value={person} onChange={event => setPerson(event.target.value)} className={inputClass}>
                  <option value={EVERYONE}>Everyone</option>
                  {people.map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <FilterPills items={pills} active={kind} onChange={setKind} label="Filter by event type" />
            </div>
            {next !== null && (
              <p className="mt-3 text-xs text-marino/60">The filters apply to the events loaded so far.</p>
            )}

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
                      {day.rows.map(({ event, actor, kind: eventKind, text }) => (
                        <li key={event.id} className="relative flex items-start gap-3">
                          <span aria-hidden className="absolute -left-[25px] top-3 h-2 w-2 rounded-full bg-cielo" />
                          <Avatar name={actor.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm">
                              <span className="font-semibold">{actor.name}</span> {text}
                            </p>
                            {event.change && (
                              <p className="mt-1 break-words text-sm text-marino/80">
                                {describeChange(event.action, event.change)}
                              </p>
                            )}
                            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-marino/60">
                              <Badge>{EVENT_KINDS[eventKind]}</Badge>
                              <time dateTime={event.at}>{formatTime(event.at)}</time>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          {failure && <FailureNote failure={failure} className="mb-4" />}
          {next !== null ? (
            !refused && (
              <button
                type="button"
                onClick={() => loadMore(next)}
                disabled={loadingMore}
                className={buttonClass.secondary}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )
          ) : (
            rows.length > 0 && <p className="text-xs text-marino/60">That is the whole log.</p>
          )}
        </div>
      </Card>
    </>
  );
}
