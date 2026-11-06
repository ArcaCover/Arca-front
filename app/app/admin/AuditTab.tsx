"use client";

import { useEffect, useState } from "react";
import type { AdminAuditEventView, AdminOrgView } from "@arca/contracts";

import { Badge, buttonClass, formatDate, inputClass } from "@/components/app/ui";
import { adminListAudit } from "@/lib/app/client";

import { describeAction, formatTime } from "../activity/events";
import { ACTOR_KIND_LABEL, messageOf } from "./shared";

// ARCA's own audit across organizations, newest first, a page at a time (DN-11 §4.5). Unlike an organization's activity it
// names ARCA staff by email: it is ARCA's record of what its own people did.

type Log = { orgId: string; events: AdminAuditEventView[]; nextBefore: number | null };

/** The empty string is every organization. */
const filterOf = (orgId: string) => (orgId ? { orgId } : {});

function actorOf(event: AdminAuditEventView): string {
  if (event.actorEmail) return event.actorEmail;
  return event.actorKind === "member" ? "A member" : ACTOR_KIND_LABEL[event.actorKind];
}

export function AuditTab({
  organizations, orgId, onOrgChange,
}: { organizations: AdminOrgView[]; orgId: string; onOrgChange: (orgId: string) => void }) {
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminListAudit(filterOf(orgId))
      .then(page => {
        if (!cancelled) setLog({ orgId, ...page });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(messageOf(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function pick(next: string) {
    setLog(null);
    setError(null);
    onOrgChange(next);
  }

  async function loadMore(before: number) {
    setError(null);
    setLoadingMore(true);
    try {
      const page = await adminListAudit({ ...filterOf(orgId), before });
      // A page that arrives after the filter changed belongs to the old list.
      setLog(current =>
        current?.orgId === orgId ? { ...current, events: [...current.events, ...page.events], nextBefore: page.nextBefore } : current,
      );
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoadingMore(false);
    }
  }

  // An organization opened from its detail may be newer than the list this page loaded.
  const known = !orgId || organizations.some(org => org.id === orgId);
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

      {!log && !error && (
        <p role="status" className="mt-6 text-sm text-marino/70">
          Loading the audit…
        </p>
      )}
      {log && log.events.length === 0 && <p className="mt-6 text-sm text-marino/70">No events.</p>}
      {log && log.events.length > 0 && (
        <ol aria-label="Audit events" className="mt-6 space-y-3">
          {log.events.map(event => (
            <li key={event.id} className="rounded-3xl border border-marino/10 bg-white p-4 text-sm">
              <p className="break-words">
                <span className="font-semibold">{actorOf(event)}</span> {describeAction(event.action, event.targetLabel).text}
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

      {error && (
        <p role="alert" className="mt-6 text-sm text-rojo">
          {error}
        </p>
      )}
      {next !== null && (
        <button type="button" onClick={() => loadMore(next)} disabled={loadingMore} className={`${buttonClass.secondary} mt-6`}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
