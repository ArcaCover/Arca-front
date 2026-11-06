"use client";

import { useEffect, useState } from "react";
import type { AdminAuditEventView, AdminOrgView } from "@arca/contracts";

import { Badge, buttonClass, formatDate, inputClass } from "@/components/app/ui";
import { adminListAudit } from "@/lib/app/client";
import { ACTOR_KIND_LABEL } from "@/lib/app/labels";

import { describeAction, formatTime } from "../activity/events";
import { FailureNote, ReadFailed, refusalOf, type Failure } from "../activity/ReadFailed";
import { messageOf } from "./shared";

// ARCA's own audit across organizations, newest first, a page at a time (DN-11 §4.5). Unlike an organization's activity it
// names ARCA staff by email: it is ARCA's record of what its own people did.

type Log = { orgId: string; events: AdminAuditEventView[]; nextBefore: number | null };

/** The empty string is every organization. */
const filterOf = (orgId: string) => (orgId ? { orgId } : {});

function actorOf(event: AdminAuditEventView): string {
  if (event.actorEmail) return event.actorEmail;
  return event.actorKind === "member" ? "A member" : ACTOR_KIND_LABEL[event.actorKind];
}

const sentenceOf = (event: AdminAuditEventView) =>
  describeAction(event.action, event.targetLabel, { member: event.actorKind === "member", email: event.actorEmail }).text;

export function AuditTab({
  organizations, orgId, onOrgChange,
}: { organizations: AdminOrgView[]; orgId: string; onOrgChange: (orgId: string) => void }) {
  const [log, setLog] = useState<Log | null>(null);
  // Only the first page's failure; a later page's is kept with its list below.
  const [failure, setFailure] = useState<Failure | null>(null);
  // Bumped by Try again, so a first page that failed is asked for again without leaving the tab.
  const [attempt, setAttempt] = useState(0);
  // The next page being read, or why it could not be, for the list it extends. Tied to that list, so a page asked before
  // the filter changed neither keeps the new list's button busy nor shows its error there.
  const [more, setMore] = useState<{ list: Log; failure: Failure | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminListAudit(filterOf(orgId))
      .then(page => {
        if (!cancelled) setLog({ orgId, ...page });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setFailure({ message: messageOf(cause), cause });
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, attempt]);

  function pick(next: string) {
    setLog(null);
    setFailure(null);
    onOrgChange(next);
  }

  function retry() {
    setFailure(null);
    setAttempt(value => value + 1);
  }

  async function loadMore(list: Log, before: number) {
    setMore({ list, failure: null });
    try {
      const page = await adminListAudit({ ...filterOf(list.orgId), before });
      // A page that arrives after the filter changed belongs to a list no longer on screen.
      setLog(current =>
        current === list ? { ...list, events: [...list.events, ...page.events], nextBefore: page.nextBefore } : current,
      );
      setMore(current => (current?.list === list ? null : current));
    } catch (cause) {
      setMore(current => (current?.list === list ? { list, failure: { message: messageOf(cause), cause } } : current));
    }
  }

  // An organization opened from its detail may be newer than the list this page loaded.
  const known = !orgId || organizations.some(org => org.id === orgId);
  const mine = log !== null && more?.list === log ? more : null;
  const loadingMore = mine !== null && mine.failure === null;
  // A later page the back refused would be refused again, so Load more goes and the note says why.
  const refused = refusalOf(mine?.failure?.cause) !== undefined;
  const next = log?.nextBefore ?? null;
  return (
    <div>
      <label className="block max-w-sm text-sm">
        <span className="font-semibold">Organization</span>
        <select value={orgId} onChange={event => pick(event.target.value)} className={inputClass}>
          <option value="">All organizations</option>
          {!known && <option value={orgId}>{orgId}</option>}
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name || org.id}
            </option>
          ))}
        </select>
      </label>

      {!log &&
        (failure ? (
          <ReadFailed failure={failure} onRetry={retry} className="mt-6" />
        ) : (
          <p role="status" className="mt-6 text-sm text-marino/70">
            Loading the audit…
          </p>
        ))}
      {log && log.events.length === 0 && <p className="mt-6 text-sm text-marino/70">No events.</p>}
      {log && log.events.length > 0 && (
        <ol aria-label="Audit events" className="mt-6 space-y-3">
          {log.events.map(event => (
            <li key={event.id} className="rounded-3xl border border-marino/10 bg-white p-4 text-sm">
              <p className="break-words">
                <span className="font-semibold">{actorOf(event)}</span> {sentenceOf(event)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-marino/60">
                <Badge>{ACTOR_KIND_LABEL[event.actorKind]}</Badge>
                <span>{event.orgId === null ? "Platform" : event.orgName ?? event.orgId}</span>
                <time dateTime={event.at}>
                  {formatDate(event.at)}, {formatTime(event.at)}
                </time>
                <code>{event.action}</code>
              </p>
            </li>
          ))}
        </ol>
      )}

      {mine?.failure && <FailureNote failure={mine.failure} className="mt-6" />}
      {log && next !== null && !refused && (
        <button type="button" onClick={() => loadMore(log, next)} disabled={loadingMore} className={`${buttonClass.secondary} mt-6`}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
