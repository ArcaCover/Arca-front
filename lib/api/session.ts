// The scan session token is a capability: 24 hours, bound to one scanId and the email that
// started it. It lives in sessionStorage rather than a cookie because it is not a user
// session — losing it on tab close is the behaviour we want.
//
// The email and the domain deliberately do NOT travel in the URL any more (CLAUDE.md §8:
// never put insured data in a URL). The scanId identifies the funnel from here on.

const key = (scanId: string) => `arca.scan.${scanId}`;

// Private-mode browsers throw on access rather than returning null, so every call is guarded.
export function rememberSession(scanId: string, sessionToken: string): void {
  try {
    sessionStorage.setItem(key(scanId), sessionToken);
  } catch {
    // A session we cannot store means polling will 401 and the funnel restarts at /quote.
  }
}

export function recallSession(scanId: string): string | null {
  try {
    return sessionStorage.getItem(key(scanId));
  } catch {
    return null;
  }
}

export function forgetSession(scanId: string): void {
  try {
    sessionStorage.removeItem(key(scanId));
  } catch {
    // Nothing to do: the token expires in 24 hours regardless.
  }
}
