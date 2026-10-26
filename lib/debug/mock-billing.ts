import { apiFailure, apiSend } from "@/lib/api/client";

// Stands in for Stripe's checkout.session.completed in the mock back (DN-10 section 4.4): it pays a checkout session
// the mock provider issued. The route exists only in mock and refuses a request without the debug header. Only the
// bridge reaches this module, and only in mock.

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
