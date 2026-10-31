// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).

// Dates relative to today, computed once, so the sample reads as recent without any randomness.
const DAY = 86_400_000;
const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 12));

export const daysAgo = (days: number) => new Date(today.getTime() - days * DAY).toISOString();
export const daysAhead = (days: number) => daysAgo(-days);

/** Short month names for the last `count` months, oldest first, ending with this month. */
export function lastMonths(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (count - 1 - index), 1));
    return date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  });
}
