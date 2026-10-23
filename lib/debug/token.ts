// The panel shows when the scan's token was issued and when it expires, and nothing else from it: the payload also
// carries the email, which the panel never shows (DN-09 §7).
export type TokenTimes = { issuedAt: string; expiresAt: string };

export function tokenTimes(token: string): TokenTimes | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const { iat, exp } = JSON.parse(new TextDecoder().decode(bytes)) as { iat?: unknown; exp?: unknown };
    if (typeof iat !== "number" || typeof exp !== "number") return null;
    // toISOString throws on a time out of range, which lands in the catch.
    return { issuedAt: new Date(iat * 1000).toISOString(), expiresAt: new Date(exp * 1000).toISOString() };
  } catch {
    return null;
  }
}
