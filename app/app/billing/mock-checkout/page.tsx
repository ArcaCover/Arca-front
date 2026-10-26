"use client";

import { Suspense, useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import { debugPay } from "@/lib/debug/bridge";

// Where the mock back's checkout sends the owner instead of Stripe (DN-10 §4.4). Outside mock the bridge answers null and
// nothing is paid.
function MockCheckout() {
  const router = useRouter();
  const session = useSearchParams().get("session");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pay() {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      const paid = await debugPay(session);
      if (paid) {
        router.replace("/app?paid=1");
        return;
      }
      setMessage(paid === null ? "Simulated payments exist only in mock mode." : "This checkout was already paid or does not exist.");
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "The payment did not go through. Please try again.");
    }
    setBusy(false);
  }

  return (
    <section className="max-w-md">
      <h1 className="font-heading text-2xl">Checkout (simulation)</h1>
      <p className="mt-3 text-sm text-marino/70">No card and no Stripe: this page stands in for the checkout in mock mode.</p>
      {!session && (
        <p role="alert" className="mt-4 text-sm">
          This link has no checkout session. Start again from Billing.
        </p>
      )}
      <button
        type="button"
        onClick={pay}
        disabled={busy || !session}
        className="mt-6 rounded-full bg-oro px-5 py-2 text-sm font-semibold disabled:opacity-60"
      >
        Simulated payment
      </button>
      {message && (
        <p role="alert" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

export default function MockCheckoutPage() {
  // Only the mock back has a simulated checkout; in every other mode this page does not exist (DN-09 literal guard).
  if (process.env.NEXT_PUBLIC_ARCA_MODE === "mock") {
    return (
      <Suspense fallback={null}>
        <MockCheckout />
      </Suspense>
    );
  }
  notFound();
}
