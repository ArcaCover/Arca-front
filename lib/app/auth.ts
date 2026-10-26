import { debugSignIn } from "@/lib/debug/bridge";

import { clearAppSession, saveAppSession } from "./session";

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

export function signOut(): void {
  clearAppSession();
}
