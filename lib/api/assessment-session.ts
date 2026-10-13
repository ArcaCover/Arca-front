const key = (scanId: string) => `arca.assessment.${scanId}`;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** An ID-only convenience in this tab; the API token still controls access and expiry. */
export function rememberAssessment(
  scanId: string,
  assessmentId: string,
  expiresAt?: string,
): void {
  try {
    const previous = read(scanId);
    const expiry = expiresAt
      ? Date.parse(expiresAt)
      : (previous?.expiresAt ?? Date.now() + MAX_AGE_MS);
    sessionStorage.setItem(
      key(scanId),
      JSON.stringify({
        assessmentId,
        expiresAt: Math.min(expiry, Date.now() + MAX_AGE_MS),
      }),
    );
  } catch {
    /* Resume still works with the IDs in the current URL. */
  }
}

function read(
  scanId: string,
): { assessmentId: string; expiresAt: number } | null {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(key(scanId)) ?? "null",
    );
    if (
      !value ||
      typeof value !== "object" ||
      !("assessmentId" in value) ||
      !("expiresAt" in value)
    )
      return null;
    if (
      typeof value.assessmentId !== "string" ||
      typeof value.expiresAt !== "number"
    )
      return null;
    return { assessmentId: value.assessmentId, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}

export function recallAssessment(scanId: string): string | null {
  const saved = read(scanId);
  return saved && saved.expiresAt > Date.now() ? saved.assessmentId : null;
}

export function forgetAssessment(scanId: string): void {
  try {
    sessionStorage.removeItem(key(scanId));
  } catch {
    /* Storage may be unavailable. */
  }
}
