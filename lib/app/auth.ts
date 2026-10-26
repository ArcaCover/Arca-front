import { debugSignIn } from "@/lib/debug/bridge";

import { clearAppSession, clearPendingClaim, forgetOrg, saveAppSession } from "./session";

/** `not_configured` until Supabase Auth is wired up, which comes after the demo: only the mock sign-in exists today. */
export async function signIn(
  email: string,
  opts?: { platformAdmin?: boolean },
): Promise<"signed_in" | "not_configured"> {
  const session = await debugSignIn(email, opts?.platformAdmin);
  if (!session) return "not_configured";
  saveAppSession(session);
  return "signed_in";
}

// Everything the webapp kept for this person goes with them: the next one to sign in on this browser starts clean.
export function signOut(): void {
  clearAppSession();
  forgetOrg();
  clearPendingClaim();
}
