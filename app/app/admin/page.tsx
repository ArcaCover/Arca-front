"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import type { DeletionRequestView, PlanView } from "@arca/contracts";

import { ApiError } from "@/lib/api/client";
import {
  adminListDeletionRequests, adminListOrganizations, adminListPlans, adminReviewDeletion, adminUpdatePlan, getMe,
} from "@/lib/app/client";
import { formatPrice } from "@/lib/app/price";

// A proof of concept of ARCA's own panel (DN-10 §4.6): the plans' prices and the deletion queue. It asks /me itself,
// because a platform admin need not belong to any organization; the admin routes refuse everyone else anyway.

type Panel = { plans: PlanView[]; requests: DeletionRequestView[]; orgNames: Map<string, string> };
type State = { kind: "loading" } | { kind: "not_admin" } | { kind: "ready"; panel: Panel } | { kind: "failed"; message: string };

const messageOf = (cause: unknown) => (cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");

export default function AdminPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      return { kind: "ready", panel: { plans, requests, orgNames } } as const;
    })()
      .then(next => {
        if (!cancelled) setState(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setState({ kind: "failed", message: messageOf(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <p role="alert" className="text-sm text-rojo">
        {state.message}
      </p>
    );
  }

  const { plans, requests, orgNames } = state.panel;
  return (
    <>
      <h1 className="font-heading text-2xl">Platform admin (proof of concept)</h1>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm">
          {notice}
        </p>
      )}

      <h2 className="mt-8 font-heading text-lg">Plans</h2>
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
}
