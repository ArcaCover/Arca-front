import { apiFailure, apiSend } from "@/lib/api/client";

// Stands in for Stripe's checkout.session.completed (DN-10 section 4.4): it pays a checkout session the back's mock
// provider issued. The route exists in mock and in live-debug, never in production, and refuses a request without the
// debug header. Only the bridge reaches this module, and only in those two modes.

/** True when the session was paid; false when it is unknown or was already paid. */
export async function mockPay(sessionId: string): Promise<boolean> {
  const response = await apiSend("/__debug/billing/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Arca-Debug": "1" },
    body: JSON.stringify({ sessionId }),
  });
  if (response.ok) return true;
  const failure = await apiFailure(response);
  if (failure.code === "conflict") return false;
  throw failure;
}
