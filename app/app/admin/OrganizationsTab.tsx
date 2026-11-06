"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ScrollText } from "lucide-react";
import type { AdminOrgDetailView, AdminOrgView } from "@arca/contracts";

import { Badge, Field, buttonClass, formatDate } from "@/components/app/ui";
import { adminGetOrganization, adminListOrganizations } from "@/lib/app/client";
import { BILLING_STATUS_LABEL, ROLE_LABEL } from "@/lib/app/labels";

import { LoadFailed } from "./LoadFailed";
import { messageOf } from "./shared";

// Every organization, the deleted ones too, and one of them in full without leaving /app/admin (DN-11 §4.5, §6.4): the
// layout's staff guard matches that path exactly, so the detail is state of this tab, not a page of its own.

const nameOf = (org: { id: string; name: string }) => org.name || org.id;
const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

export function OrganizationsTab({ onAudit }: { onAudit: (orgId: string) => void }) {
  const [list, setList] = useState<AdminOrgView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  // Bumped by Try again, so a list that failed is asked for again without leaving the tab.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminListOrganizations()
      .then(next => {
        if (!cancelled) setList(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(messageOf(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (open) return <OrganizationDetail id={open} onBack={() => setOpen(null)} onAudit={onAudit} />;
  if (error) {
    return (
      <LoadFailed
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt(value => value + 1);
        }}
      />
    );
  }
  if (!list) {
    return (
      <p role="status" className="text-sm text-marino/70">
        Loading organizations…
      </p>
    );
  }
  if (list.length === 0) return <p className="text-sm text-marino/70">No organizations yet.</p>;
  return (
    <ul aria-label="Organizations" className="space-y-3">
      {list.map(org => (
        <li key={org.id} className="flex flex-wrap items-center gap-3 rounded-3xl border border-marino/10 bg-white p-4 text-sm">
          <span className="min-w-0 flex-1 break-words">
            <strong>{nameOf(org)}</strong> · {count(org.members, "member", "members")}
          </span>
          <Badge>{BILLING_STATUS_LABEL[org.billingStatus]}</Badge>
          {org.deleted && <Badge tone="danger">Deleted</Badge>}
          <button type="button" aria-label={`Open ${nameOf(org)}`} onClick={() => setOpen(org.id)} className={buttonClass.secondary}>
            Open
          </button>
        </li>
      ))}
    </ul>
  );
}

function OrganizationDetail({ id, onBack, onAudit }: { id: string; onBack: () => void; onAudit: (orgId: string) => void }) {
  const [detail, setDetail] = useState<AdminOrgDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminGetOrganization(id)
      .then(next => {
        if (!cancelled) setDetail(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(messageOf(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = (
    <button type="button" onClick={onBack} className={buttonClass.ghost}>
      <ArrowLeft aria-hidden className="h-4 w-4" />
      All organizations
    </button>
  );
  if (!detail) {
    return (
      <>
        {back}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-rojo">
            {error}
          </p>
        ) : (
          <p role="status" className="mt-4 text-sm text-marino/70">
            Loading the organization…
          </p>
        )}
      </>
    );
  }

  const pending = detail.pendingDeletion;
  return (
    <section aria-label={nameOf(detail)}>
      {back}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="break-words font-heading text-lg">{nameOf(detail)}</h2>
        <Badge>{BILLING_STATUS_LABEL[detail.billingStatus]}</Badge>
        {detail.deleted && <Badge tone="danger">Deleted</Badge>}
      </div>
      <dl className="mt-4 grid gap-4 rounded-3xl border border-marino/10 bg-white p-4 sm:grid-cols-3">
        <Field label="Domain">{detail.domain ?? "None"}</Field>
        <Field label="Created">{formatDate(detail.createdAt)}</Field>
        <Field label="Plan">{detail.planCode ?? "No subscription"}</Field>
        <Field label="Analyses">{detail.analysisCount}</Field>
        <Field label="Deletion request">
          {pending ? `Pending since ${formatDate(pending.requestedAt)}: ${pending.reason}` : "None pending"}
        </Field>
        <Field label="ID">
          <code className="break-all text-xs">{detail.id}</code>
        </Field>
      </dl>

      <h3 className="mt-6 font-heading text-base">Members</h3>
      {detail.members.length === 0 ? (
        <p className="mt-2 text-sm text-marino/70">None.</p>
      ) : (
        <ul aria-label="Members" className="mt-3 divide-y divide-marino/10 rounded-3xl border border-marino/10 bg-white text-sm">
          {detail.members.map(member => (
            <li key={member.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1 break-all">{member.email}</span>
              <Badge>{ROLE_LABEL[member.role]}</Badge>
              <span className="text-xs text-marino/60">Joined {formatDate(member.joinedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => onAudit(detail.id)} className={`${buttonClass.secondary} mt-6`}>
        <ScrollText aria-hidden className="h-4 w-4" />
        See its audit
      </button>
    </section>
  );
}
