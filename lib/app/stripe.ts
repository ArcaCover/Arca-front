import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

// Stripe.js for the embedded Checkout of the real accounts (DN-13 §19). The `pure` entry loads nothing when imported: Stripe's script
// is fetched the first time a payment opens, never in the debug modes, which pay through the simulated checkout. The key is the
// publishable one (pk_), public by design; null without it, and the payment says it cannot open.
let stripe: Promise<Stripe | null> | null = null;

export function stripePromise(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripe ??= loadStripe(key);
  return stripe;
}
