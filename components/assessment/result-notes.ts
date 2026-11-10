import type { AssessmentResult } from "@arca/contracts";

/** The Layer 1 flag for a firm website that could not be read; the results screen gives it its own notice. */
export const WEBSITE_UNAVAILABLE = "WEBSITE_UNAVAILABLE";

/** The notice for that flag. The API takes the tier from the combined score, so better answers can move the outlook
    out of the highest-risk group: only the manual review holds whatever the answers show. The group is named only when
    the API's own tier is CRITICAL, so the sentence cannot contradict the badge beside it. The back's assessment PDF
    prints the same sentences (DN-12 §8). */
export function websiteNotice(tier: AssessmentResult["tier"]): string {
  return [
    "We could not read your firm's website during the scan.",
    tier === "CRITICAL"
      ? "This outlook is in the highest-risk group, and because the website could not be read, it needs a manual review whatever your answers show."
      : "Until it can be read, this outlook needs a manual review, whatever your answers show.",
    "This is not a coverage decision or a price.",
  ].join(" ");
}

// The whole list of flags a visitor ever reads about, each worded once. A result's flags are the API's machine codes,
// and most are for us (provider accounting, the demo markers, identity matching), so a flag that is not here renders
// nothing, including one the API adds later.
// A source that did not answer is a gap in the collection; thin evidence from sources that all answered is not, and
// /score says the same apart ("All three public sources answered…"). Only one of the two is ever shown.
const MISSING_SOURCES = ["INCOMPLETE_SOURCES"];
const THIN_EVIDENCE = ["INCOMPLETE_EVIDENCE", "INSUFFICIENT_EVIDENCE"];
const NOTES: ReadonlyArray<readonly [flags: readonly string[], sentence: string]> = [
  [["NO_AI_POLICY"], "Your answers say the firm has no AI policy yet."],
  [["CONSUMER_AI_IN_CLIENT_WORK"], "Free or personal AI accounts are used for client work."],
  [["NO_HUMAN_REVIEW"], "AI-assisted work reaches clients without a lawyer’s review."],
  [["NO_CITATION_REVIEW"], "AI-generated citations are not checked consistently."],
  [["NO_DATA_SAFEGUARDS"], "No consistent safeguards protect client information in AI tools."],
  [["ANSWER_CONTRADICTS_WEBSITE"], "One answer does not match what the scan read on the firm’s website."],
  [["INCOMPLETE_SCORED_COVERAGE"], "Some areas were scored on fewer answers than planned."],
  [MISSING_SOURCES, "The quick scan could not gather all the public evidence, so that part of the score rests on less than usual."],
  [THIN_EVIDENCE, "The public evidence about the firm was limited, so that part of the score rests on less than usual."],
];

const isEvidence = (codes: readonly string[]) => codes === MISSING_SOURCES || codes === THIN_EVIDENCE;

/** The sentences under "Notes for review", in a fixed order. Empty when no flag is one a visitor can act on. */
export function resultNotes(flags: readonly string[]): string[] {
  const has = (codes: readonly string[]) => codes.some((code) => flags.includes(code));
  return NOTES.filter(
    ([codes]) =>
      has(codes) &&
      // The website notice already says the public evidence is missing.
      !(isEvidence(codes) && flags.includes(WEBSITE_UNAVAILABLE)) &&
      // A missing source already explains why the evidence is thin.
      !(codes === THIN_EVIDENCE && has(MISSING_SOURCES)),
  ).map(([, sentence]) => sentence);
}
