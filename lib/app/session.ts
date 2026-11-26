import { getSupabase } from "@/lib/supabase";

import { realAccounts } from "./accounts";

// What the private webapp keeps in the browser (DN-10). Three things, each in the storage that fits it:
// - the app session: with the real accounts (DN-13 §4.3), the Supabase client's, in cookies it manages and refreshes;
//   with the simulated ones of the debug modes, the simulated token in localStorage, which has to survive closing the tab;
// - the pending claim (sessionStorage): the ticket that carries a funnel analysis through sign-up, which belongs to
//   one tab and has no reason to outlive it;
// - the last organization used (localStorage): only a convenience, the API decides what the user may open.
//
// This is not the scan session of lib/api/session.ts: that token is bound to one scan and never mixes with this one.

export type AppSession = { token: string; email: string; expiresAt: string };
export type PendingClaim = { claimId: string; email: string; expiresAt: string };

const SESSION_KEY = "arca.app.session";
const CLAIM_KEY = "arca.app.claim";
const ORG_KEY = "arca.app.org";

// Storage can throw on access (private mode, blocked site data) and does not exist on the server, so every call below is
// guarded and a failure reads as "nothing stored".
type Area = () => Storage;
const local: Area = () => localStorage;
const tab: Area = () => sessionStorage;

function read(area: Area, key: string): string | null {
  try {
    return area().getItem(key);
  } catch {
    return null;
  }
}

function write(area: Area, key: string, value: string): void {
  try {
    area().setItem(key, value);
  } catch {
    // Not stored means the user signs in again; nothing here is required to be kept.
  }
}

function remove(area: Area, key: string): void {
  try {
    area().removeItem(key);
  } catch {
    // Nothing to do: the token expires on its own.
  }
}

// Whatever sits under the key is untrusted until it parses into an object of strings.
function readObject(area: Area, key: string): Record<string, unknown> | null {
  const raw = read(area, key);
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const isText = (value: unknown): value is string => typeof value === "string";
// An unreadable date is not in time either: NaN compares false.
const inTime = (expiresAt: string) => Date.parse(expiresAt) > Date.now();

export function saveAppSession({ token, email, expiresAt }: AppSession): void {
  write(local, SESSION_KEY, JSON.stringify({ token, email, expiresAt }));
}

/** The signed-in session, or null when there is none or it has expired (an expired token is not kept around). */
export function loadAppSession(): AppSession | null {
  const stored = readObject(local, SESSION_KEY);
  if (!stored) return null;
  const { token, email, expiresAt } = stored;
  if (!isText(token) || !isText(email) || !isText(expiresAt)) return null;
  if (!inTime(expiresAt)) {
    clearAppSession();
    return null;
  }
  return { token, email, expiresAt };
}

export function clearAppSession(): void {
  remove(local, SESSION_KEY);
}

export function savePendingClaim({ claimId, email, expiresAt }: PendingClaim): void {
  write(tab, CLAIM_KEY, JSON.stringify({ claimId, email, expiresAt }));
}

/** The claim ticket waiting to become an organization, or null when there is none or its 24 hours are up. */
export function loadPendingClaim(): PendingClaim | null {
  const stored = readObject(tab, CLAIM_KEY);
  if (!stored) return null;
  const { claimId, email, expiresAt } = stored;
  if (!isText(claimId) || !isText(email) || !isText(expiresAt)) return null;
  if (!inTime(expiresAt)) {
    clearPendingClaim();
    return null;
  }
  return { claimId, email, expiresAt };
}

export function clearPendingClaim(): void {
  remove(tab, CLAIM_KEY);
}

export function rememberOrg(id: string): void {
  write(local, ORG_KEY, id);
}

export function recallOrg(): string | null {
  return read(local, ORG_KEY);
}

export function forgetOrg(): void {
  remove(local, ORG_KEY);
}

/** What an API call needs of the signed-in person: the Bearer token, and the email it was issued for. */
export type SignedIn = { token: string; email: string };

/**
 * The session the API calls carry, read again before each one (DN-13 §4.3). With the real accounts it is the Supabase
 * client's, which refreshes an expiring access token on the way; the simulated storage is never read then. Otherwise it is
 * the simulated session of the debug modes. null when there is none, or the client could not read or refresh it.
 */
export async function currentAppSession(): Promise<SignedIn | null> {
  if (!realAccounts()) {
    const stored = loadAppSession();
    return stored && { token: stored.token, email: stored.email };
  }
  try {
    const { data, error } = await getSupabase().auth.getSession();
    const session = data.session;
    if (error || !session?.access_token || !session.user.email) return null;
    return { token: session.access_token, email: session.user.email };
  } catch {
    return null;
  }
}

// True while this tab ends its own real session: whoever asked for it (the sign-out button, a deleted account) also says where
// to go next, so the watchers below stay out of it.
let endingHere = false;

/** Ends the real session on this browser only (`scope: 'local'`), without waking the watchers of watchSessionEnd. */
export async function endRealSession(): Promise<void> {
  endingHere = true;
  try {
    await getSupabase().auth.signOut({ scope: "local" });
  } finally {
    endingHere = false;
  }
}

/**
 * Calls `onEnd` when the real session ends outside the page's own doing: a refresh token that no longer works, or a sign-out
 * in another tab. Returns the unsubscribe. The simulated session has no such events. The call is deferred, because the
 * client's own listeners must not call back into it while it notifies them.
 */
export function watchSessionEnd(onEnd: () => void): () => void {
  if (!realAccounts()) return () => {};
  let watching = true;
  const { data } = getSupabase().auth.onAuthStateChange(event => {
    // A call still pending when the watcher is dropped is dropped with it.
    if (event === "SIGNED_OUT" && !endingHere) setTimeout(() => watching && onEnd(), 0);
  });
  return () => {
    watching = false;
    data.subscription.unsubscribe();
  };
}
