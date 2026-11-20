"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

import { buttonClass } from "@/components/app/ui";
import { ApiError } from "@/lib/api/client";
import { embeddedCheckout } from "@/lib/app/client";
import { stripePromise } from "@/lib/app/stripe";

const NOT_AVAILABLE = "Payments are not available in this environment yet. Your account is saved: you can pay later from Billing.";

/**
 * Stripe's Checkout inside ARCA's page (DN-13 §19), for the real accounts only: the sign-up's last step and the billing page of an
 * organization that has not paid. The back opens the session (one open per organization, so a reload gets the same one) with the
 * firm's details already on the Stripe customer; Stripe takes the card and sends the page to /app/billing/return when it is paid.
 * Asking again for another plan mounts a new one: the parent keys this component by plan.
 */
export default function EmbeddedPayment({ orgId, planCode }: { orgId: string; planCode: string }) {
  const [attempt, setAttempt] = useState(0);
  const stripe = stripePromise();
  if (!stripe) {
    return (
      <p role="alert" className="rounded-2xl bg-bruma p-4 text-sm">
        {NOT_AVAILABLE}
      </p>
    );
  }
  return <Session key={attempt} orgId={orgId} planCode={planCode} stripe={stripe} onRetry={() => setAttempt(value => value + 1)} />;
}

type State = { kind: "loading" } | { kind: "ready"; clientSecret: string } | { kind: "failed"; message: string; paid: boolean };

function Session({ orgId, planCode, stripe, onRetry }: {
  orgId: string; planCode: string; stripe: NonNullable<ReturnType<typeof stripePromise>>; onRetry: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    embeddedCheckout(orgId, planCode)
      .then(({ clientSecret }) => {
        if (!cancelled) setState({ kind: "ready", clientSecret });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        // The back answers 409 when the organization already pays: a second subscription is the portal's business.
        const paid = cause instanceof ApiError && cause.code === "conflict" && /already paid/i.test(cause.message);
        setState({ kind: "failed", paid,
          message: paid ? "Your organization's plan is already active."
            : cause instanceof ApiError ? cause.message : "The payment could not open. Please try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, planCode]);

  // Stripe's provider must keep the same options object for as long as it is mounted.
  const options = useMemo(() => (state.kind === "ready" ? { clientSecret: state.clientSecret } : null), [state]);

  if (state.kind === "failed") {
    return (
      <div className="rounded-2xl bg-bruma p-4">
        <p role="alert" className="text-sm">
          {state.message}
        </p>
        {state.paid ? (
          <Link href="/app" className={`${buttonClass.primary} mt-3`}>
            Go to your workspace
          </Link>
        ) : (
          <button type="button" onClick={onRetry} className={`${buttonClass.primary} mt-3`}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (!options) {
    return (
      <p role="status" className="rounded-2xl border border-dashed border-marino/20 p-6 text-center text-sm text-marino/70">
        Opening the secure payment form…
      </p>
    );
  }
  return (
    // Stripe draws its own form in an iframe; the frame only gives it room and ARCA's corners.
    <div className="overflow-hidden rounded-2xl border border-marino/10 bg-white">
      <EmbeddedCheckoutProvider stripe={stripe} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
