"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import type { AdminOrgView, DeletionRequestView, PlanView } from "@arca/contracts";

import { Tabs, type TabItem } from "@/components/app/ui";
import {
  adminListDeletionRequests, adminListOrganizations, adminListPlans, adminReviewDeletion, adminUpdatePlan, getMe,
} from "@/lib/app/client";
import { formatPrice } from "@/lib/app/price";

import { ReadFailed, type Failure } from "../activity/ReadFailed";
import { AuditTab } from "./AuditTab";
import { MetricsTab } from "./MetricsTab";
import { OrganizationsTab } from "./OrganizationsTab";
import { messageOf } from "./shared";

// A proof of concept of ARCA's own panel (DN-10 §4.6, DN-11 §4.5). It asks /me itself, because a platform admin need not
// belong to any organization; the admin routes refuse everyone else anyway. Operations, the default tab, is the panel as
// DN-10 left it: the plans' prices and the deletion queue. The others read the organizations, the audit and the counts.
// The tabs are local state, not paths, so the layout's staff guard keeps matching /app/admin exactly.

type Panel = { plans: PlanView[]; requests: DeletionRequestView[]; organizations: AdminOrgView[]; orgNames: Map<string, string> };
type State = { kind: "loading" } | { kind: "not_admin" } | { kind: "ready"; panel: Panel } | { kind: "failed"; failure: Failure };

type Tab = "operations" | "organizations" | "audit" | "metrics";
const TABS: TabItem<Tab>[] = [
  { key: "operations", label: "Operations" },
  { key: "organizations", label: "Organizations" },
  { key: "audit", label: "Audit" },
  { key: "metrics", label: "Metrics" },
];

export default function AdminPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("operations");
  // The audit's organization filter; empty for every organization. Kept here so an organization's detail can open it.
  const [auditOrg, setAuditOrg] = useState("");
  // Bumped by Try again, so a panel that failed is asked for again without leaving the page.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getMe();
      if (!me.platformAdmin) return { kind: "not_admin" } as const;
      const [plans, requests, organizations] = await Promise.all([
        adminListPlans(),
        adminListDeletionRequests(),
        adminListOrganizations(),
      ]);
      const orgNames = new Map(organizations.map(org => [org.id, org.name]));
      return { kind: "ready", panel: { plans, requests, organizations, orgNames } } as const;
    })()
      .then(next => {
        if (!cancelled) setState(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setState({ kind: "failed", failure: { message: messageOf(cause), cause } });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function replace(change: (panel: Panel) => Panel) {
    setState(current => (current.kind === "ready" ? { kind: "ready", panel: change(current.panel) } : current));
  }

  async function savePrice(event: FormEvent<HTMLFormElement>, plan: PlanView) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    try {
      const updated = await adminUpdatePlan(plan.code, { amountCents: Math.round(amount * 100) });
      replace(panel => ({ ...panel, plans: panel.plans.map(item => (item.code === updated.code ? updated : item)) }));
      setNotice(`${updated.name} now costs ${formatPrice(updated)}.`);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function review(request: DeletionRequestView, decision: "approve" | "reject") {
    setError(null);
    setNotice(null);
    try {
      const reviewed = await adminReviewDeletion(request.id, decision);
      replace(panel => ({ ...panel, requests: panel.requests.map(item => (item.id === reviewed.id ? reviewed : item)) }));
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  if (state.kind === "loading") {
    return (
      <p role="status" className="text-sm text-marino/70">
        Loading…
      </p>
    );
  }
  if (state.kind === "not_admin") {
    return (
      <section>
        <h1 className="font-heading text-2xl">Not available</h1>
        <p className="mt-2 text-sm text-marino/70">This page is for ARCA platform admins.</p>
      </section>
    );
  }
  if (state.kind === "failed") {
    return (
      <ReadFailed
        failure={state.failure}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt(value => value + 1);
        }}
      />
    );
  }

  const { plans, requests, organizations, orgNames } = state.panel;
  const operations = (
    <>
      {error && (
        <p role="alert" className="mb-6 text-sm text-rojo">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-6 text-sm">
          {notice}
        </p>
      )}

      <h2 className="font-heading text-lg">Plans</h2>
      <p className="mt-1 text-sm text-marino/70">The next checkout charges the price saved here.</p>
      <ul className="mt-3 space-y-3">
        {plans.map(plan => {
          const currency = plan.currency.toUpperCase();
          return (
            <li key={plan.code} className="rounded-3xl border border-marino/10 bg-white p-4 text-sm">
              {/* Keyed by price, so the field shows the saved value again after a save. */}
              <form key={plan.amountCents} onSubmit={event => savePrice(event, plan)} className="flex flex-wrap items-end gap-3">
                <span className="flex-1">
                  <strong>{plan.name}</strong> · {formatPrice(plan)}
                </span>
                <label>
                  <span className="sr-only">{`Price of ${plan.name} in ${currency}`}</span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={(plan.amountCents / 100).toFixed(2)}
                    className="w-32 rounded-xl border border-marino/20 bg-white px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  aria-label={`Save the price of ${plan.name}`}
                  className="rounded-full bg-oro px-4 py-2 font-semibold"
                >
                  Save
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 font-heading text-lg">Deletion requests</h2>
      {requests.length === 0 && <p className="mt-2 text-sm text-marino/70">None.</p>}
      <ul className="mt-3 space-y-3">
        {requests.map(request => {
          const name = orgNames.get(request.orgId) ?? request.orgId;
          return (
            <li key={request.id} className="rounded-3xl border border-marino/10 bg-white p-4 text-sm">
              <p>
                <strong>{name}</strong> · requested{" "}
                {new Date(request.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} ·{" "}
                <span>{request.status}</span>
              </p>
              <p className="mt-1 text-marino/70">{request.reason}</p>
              {request.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    aria-label={`Approve the deletion of ${name}`}
                    onClick={() => review(request, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rojo/40 px-3 py-1.5 text-rojo"
                  >
                    <Check aria-hidden className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    aria-label={`Reject the deletion of ${name}`}
                    onClick={() => review(request, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-marino/20 px-3 py-1.5"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <>
      <h1 className="font-heading text-2xl">Platform admin (proof of concept)</h1>
      <div className="mt-6">
        <Tabs
          items={TABS}
          active={tab}
          onChange={setTab}
          label="Platform admin"
          panel={
            tab === "operations" ? (
              operations
            ) : tab === "organizations" ? (
              <OrganizationsTab
                onAudit={orgId => {
                  setAuditOrg(orgId);
                  setTab("audit");
                }}
              />
            ) : tab === "audit" ? (
              <AuditTab organizations={organizations} orgId={auditOrg} onOrgChange={setAuditOrg} />
            ) : (
              <MetricsTab />
            )
          }
        />
      </div>
    </>
  );
}
