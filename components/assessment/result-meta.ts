// The small print at the foot of /assessment/results: when the assessment was completed and which question bank and
// scoring model produced it.

/** The day in the visitor's own time zone: a firm in Florida that finishes in the evening must not read tomorrow's
    date. The result loads after the page mounts, so the server's zone never reaches this. */
export function completedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The number inside an id such as "0.1.0-demo.1" or "layer2-demo-fixed-coverage-0.1.0".
const VERSION = /\d+\.\d+\.\d+/;
// The word itself, with one separator, for an id that has no such number ("demo-v1").
const DEMO = /demo[-_.]?|[-_.]?demo/gi;

/** One readable line. The ids carry the word "demo", which the screen's single notice already says (CLAUDE.md, Capa 2),
    so only their version number is shown; the full ids stay in the PDF and the debug State panel. */
export function versionLine(bankVersion: string, scoringVersion: string): string {
  const readable = (id: string) => id.match(VERSION)?.[0] ?? id.replace(DEMO, "");
  return `Question bank ${readable(bankVersion)} · Scoring model ${readable(scoringVersion)}`;
}
