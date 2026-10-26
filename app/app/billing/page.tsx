"use client";

import { useEffect, useState } from "react";
import { can, type BillingStatus, type PlanView } from "@arca/contracts";

import { useApp, useFailure } from "@/components/app/AppContext";
import { checkout, getPlans } from "@/lib/app/client";
import { formatPrice } from "@/lib/app/price";

const STATUS: Record<BillingStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export default function BillingPage() {
  const { org } = useApp();
  const fail = useFailure();
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The prices come from the API's plans table, so a price changed there shows here on the next visit.
  useEffect(() => {
    let cancelled = false;
    getPlans()
      .then(list => {
        if (!cancelled) setPlans(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(fail(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [fail]);

  // DN-10 §5: the button follows the role, except in the debug modes, where it stays active so the demo shows the back's 403.
  const canPay =
    process.env.NEXT_PUBLIC_ARCA_MODE === "mock" ||
    process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ||
    can(org.role, "billing.manage");

  async function pay(plan: PlanView) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await checkout(org.id, plan.code);
      // The provider's checkout is another page (in mock, /app/billing/mock-checkout), reached by a full navigation.
      window.location.assign(url);
    } catch (cause) {
      setError(fail(cause));
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-heading text-2xl">Billing</h1>
      <p className="mt-3 text-sm">
        Status: <strong>{STATUS[org.billingStatus]}</strong>
      </p>
      {!org.paidAccess && (
        <p className="mt-2 text-sm text-marino/70">Choose a plan to open your organization&apos;s analyses.</p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-rojo">
          {error}
        </p>
      )}
      {plans === null ? (
        !error && (
          <p role="status" className="mt-6 text-sm text-marino/70">
            Loading plans…
          </p>
        )
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {plans.map(plan => (
            <li key={plan.code} className="rounded-3xl border border-marino/10 bg-white p-6">
              <h2 className="font-heading text-lg">{plan.name}</h2>
              <p className="mt-1 text-sm text-marino/70">{formatPrice(plan)}</p>
              <button
                type="button"
                aria-label={`Pay with ${plan.name}`}
                onClick={() => pay(plan)}
                disabled={busy || !canPay}
                className="mt-4 rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Pay
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
