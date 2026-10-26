// What the private webapp keeps in the browser (DN-10). Three things, each in the storage that fits it:
// - the app session (localStorage): the signed-in user's token, which has to survive closing the tab;
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
