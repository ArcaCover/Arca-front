import { vi } from "vitest";

// A stand-in for the browser's Supabase client (lib/supabase.ts), for the tests of the real accounts (DN-13 §8). It keeps one
// session, mails nothing and accepts the code or the link token a test says is valid. Only the auth calls the front makes
// exist here: the front never reads a table (DN-13 R4).

export type FakeSession = { access_token: string; user: { id: string; email: string } };
type Listener = (event: string, session: FakeSession | null) => void;

export function createFakeSupabase() {
  let session: FakeSession | null = null;
  const listeners = new Set<Listener>();
  /** The codes and link tokens that verify, with the email each one signs in. */
  const valid = { codes: new Map<string, string>(), links: new Map<string, string>() };
  const emit = (event: string) => listeners.forEach(listener => listener(event, session));
  const refused = (message: string, status = 403) => ({ data: { user: null, session: null }, error: { message, status } });

  const auth = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    signInWithOtp: vi.fn(async (_input: { email: string; options?: { shouldCreateUser?: boolean; emailRedirectTo?: string } }) => ({
      data: { user: null, session: null },
      error: null as { message: string; status?: number } | null,
    })),
    verifyOtp: vi.fn(async (input: { email?: string; token?: string; token_hash?: string; type: string }) => {
      const email = input.token_hash !== undefined
        ? valid.links.get(input.token_hash)
        : input.token !== undefined && valid.codes.get(`${input.email}:${input.token}`);
      if (input.type !== "email" || !email) return refused("Token has expired or is invalid");
      session = { access_token: `jwt-${email}`, user: { id: `user-${email}`, email } };
      emit("SIGNED_IN");
      return { data: { user: session.user, session }, error: null };
    }),
    signOut: vi.fn(async (_options?: { scope?: string }) => {
      session = null;
      emit("SIGNED_OUT");
      return { error: null };
    }),
    onAuthStateChange: vi.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    }),
  };

  return {
    auth,
    /** Starts the test already signed in, as a session the client restored from its cookies. */
    signedInAs(email: string) {
      session = { access_token: `jwt-${email}`, user: { id: `user-${email}`, email } };
    },
    /** The 6-digit code the email to this address would carry. */
    acceptCode(email: string, code: string) {
      valid.codes.set(`${email}:${code}`, email);
    },
    /** The token hash the fallback link of that email would carry. */
    acceptLink(tokenHash: string, email: string) {
      valid.links.set(tokenHash, email);
    },
    /** What the client says when the session ends elsewhere: a refresh that failed, or a sign-out in another tab. */
    endSession() {
      session = null;
      emit("SIGNED_OUT");
    },
    session: () => session,
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
