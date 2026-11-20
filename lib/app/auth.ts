import { debugSignIn } from "@/lib/debug/bridge";
import { getSupabase } from "@/lib/supabase";

import { realAccounts } from "./accounts";
import { clearAppSession, clearPendingClaim, endRealSession, forgetOrg, saveAppSession } from "./session";

/**
 * The simulated sign-in of the debug modes, through the bridge. `not_configured` anywhere else: production without the
 * webapp has no sign-in, and with it the real accounts sign in with a code instead (requestCode, verifyCode).
 */
export async function signIn(
  email: string,
  opts?: { platformAdmin?: boolean },
): Promise<"signed_in" | "not_configured"> {
  const session = await debugSignIn(email, opts?.platformAdmin);
  if (!session) return "not_configured";
  saveAppSession(session);
  return "signed_in";
}

// The real accounts (DN-13 §4.1, §17.8): the back enrolls the email (POST /auth/enroll) and Supabase mails a 6-digit code,
// typed in the same tab. The email also carries a fallback link to /app/auth/confirm, which signs in only once the person
// presses a button there: law firms' mail filters open links and would spend a single-use one.

/** Where the fallback link of the email lands; `next` is the page to go on to, kept in the link (DN-13 §4.7). */
function confirmUrl(next: string): string {
  return `${window.location.origin}/app/auth/confirm?next=${encodeURIComponent(next)}`;
}

/**
 * Asks Supabase to email a code. It never creates a user (`shouldCreateUser: false`): only the back does, for the email of a
 * claim or an invitation. False on any refusal, whatever its reason; the login shows the same message either way (§4.2).
 */
export async function requestCode(email: string, next: string): Promise<boolean> {
  try {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: confirmUrl(next) },
    });
    return !error;
  } catch {
    return false;
  }
}

/** Signs in with the 6-digit code of the email. The session stays in the Supabase client. */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    return !error && data.session !== null;
  } catch {
    return false;
  }
}

/** Signs in with the token hash of the fallback link. It needs no PKCE verifier, so the link works on another device. */
export async function confirmLink(tokenHash: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    return !error && data.session !== null;
  } catch {
    return false;
  }
}

/**
 * Where the confirm page may go after signing in: a path of the private app and nothing else (DN-13 §4.7). A link is
 * written by whoever sends it, so an absolute URL, a protocol-relative one or a backslash falls back to /app.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/app/") || /[\\\s]/.test(next)) return "/app";
  return next;
}

/**
 * Everything the webapp kept for this person goes with them: the next one to sign in on this browser starts clean. The
 * local part happens at once, before anything is awaited. With the real accounts the Supabase session ends on this browser
 * only (`scope: 'local'`). The client asks Supabase first and keeps its session if Supabase cannot be reached; an answer
 * that the session or the user is gone (as after DELETE /me) still clears it.
 */
export async function signOut(): Promise<void> {
  forgetSession();
  if (!realAccounts()) return;
  try {
    await endRealSession();
  } catch {
    // Nothing else to do here: the access token expires within the hour, and the API reads access again on every call.
  }
}

/** The local part of signOut alone: for a session that already ended elsewhere, so there is nothing to ask Supabase. */
export function forgetSession(): void {
  clearAppSession();
  forgetOrg();
  clearPendingClaim();
}
