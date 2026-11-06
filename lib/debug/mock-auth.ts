import { apiFailure, apiParse, apiSend } from "@/lib/api/client";

// The simulated sign-in of the mock back (DN-10 section 4.1): a token in the shape of a Supabase one, for any email. The
// route exists only in mock and refuses a request without the debug header. Only the bridge reaches this module, and
// only in mock.
export type MockSession = { token: string; email: string; expiresAt: string };

// The route answers with the user as well; the session keeps what the app stores of it.
const MockLoginResponse = {
  parse(value: unknown): MockSession {
    const { token, user, expiresAt } = (value ?? {}) as { token?: unknown; user?: { email?: unknown } | null; expiresAt?: unknown };
    if (typeof token !== "string" || typeof user?.email !== "string" || typeof expiresAt !== "string") {
      throw new Error("Not a mock login");
    }
    return { token, email: user.email, expiresAt };
  },
};

export async function mockSignIn(email: string, platformAdmin?: boolean): Promise<MockSession> {
  const response = await apiSend("/__debug/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Arca-Debug": "1" },
    body: JSON.stringify({ email, platformAdmin }),
  });
  if (!response.ok) throw await apiFailure(response);
  return apiParse(MockLoginResponse, await response.json().catch(() => null));
}
