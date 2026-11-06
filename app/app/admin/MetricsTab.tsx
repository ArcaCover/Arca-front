"use client";

import { useEffect, useState } from "react";
import type { AdminMetricsView } from "@arca/contracts";

import { adminGetMetrics } from "@/lib/app/client";
import { ACTION_STATUS_LABEL, BILLING_STATUS_LABEL } from "@/lib/app/labels";

import { ReadFailed, type Failure } from "../activity/ReadFailed";
import { messageOf } from "./shared";

// Counts only (DN-11 §4.5): the back sends no figure about money, and nothing here derives one.

export function MetricsTab() {
  const [metrics, setMetrics] = useState<AdminMetricsView | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  // Bumped by Try again, so counts that failed are asked for again without leaving the tab.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminGetMetrics()
      .then(next => {
        if (!cancelled) setMetrics(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setFailure({ message: messageOf(cause), cause });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (failure) {
    return (
      <ReadFailed
        failure={failure}
        onRetry={() => {
          setFailure(null);
          setAttempt(value => value + 1);
        }}
      />
    );
  }
  if (!metrics) {
    return (
      <p role="status" className="text-sm text-marino/70">
        Loading the metrics…
      </p>
    );
  }

  const { organizations, actions } = metrics;
  return (
    <div className="space-y-8">
      <p className="text-sm text-marino/70">
        Counts only. Members, analyses and actions count the organizations that are not deleted, and the actions count each
        one&apos;s current plan.
      </p>
      <Counts
        title="Organizations"
        items={[
          [BILLING_STATUS_LABEL.pending_payment, organizations.pending_payment],
          [BILLING_STATUS_LABEL.active, organizations.active],
          [BILLING_STATUS_LABEL.past_due, organizations.past_due],
          [BILLING_STATUS_LABEL.canceled, organizations.canceled],
          ["Deleted", organizations.deleted],
        ]}
      />
      <Counts
        title="Usage"
        items={[
          ["Members", metrics.members],
          ["Analyses", metrics.analyses],
          ["Pending deletion requests", metrics.pendingDeletionRequests],
        ]}
      />
      <Counts
        title="Actions"
        items={[
          [ACTION_STATUS_LABEL.todo, actions.todo],
          [ACTION_STATUS_LABEL.in_progress, actions.in_progress],
          [ACTION_STATUS_LABEL.done, actions.done],
        ]}
      />
    </div>
  );
}

function Counts({ title, items }: { title: string; items: [string, number][] }) {
  return (
    <section aria-label={title}>
      <h2 className="font-heading text-lg">{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-marino/10 bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-marino/55">{label}</dt>
            <dd className="mt-1 font-heading text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
