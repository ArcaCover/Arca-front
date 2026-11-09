/** The Layer 1 flag for a firm website that could not be read; the results screen gives it its own notice. */
export const WEBSITE_UNAVAILABLE = "WEBSITE_UNAVAILABLE";

// The whole list of flags a visitor ever reads about, each worded once. A result's flags are the API's machine codes,
// and most are for us (provider accounting, the demo markers, identity matching), so a flag that is not here renders
// nothing, including one the API adds later.
const PUBLIC_EVIDENCE = ["INCOMPLETE_SOURCES", "INCOMPLETE_EVIDENCE", "INSUFFICIENT_EVIDENCE"];
const NOTES: ReadonlyArray<readonly [flags: readonly string[], sentence: string]> = [
  [["NO_AI_POLICY"], "Your answers say the firm has no AI policy yet."],
  [["CONSUMER_AI_IN_CLIENT_WORK"], "Free or personal AI accounts are used for client work."],
  [["NO_HUMAN_REVIEW"], "AI-assisted work reaches clients without a lawyer’s review."],
  [["NO_CITATION_REVIEW"], "AI-generated citations are not checked consistently."],
  [["NO_DATA_SAFEGUARDS"], "No consistent safeguards protect client information in AI tools."],
  [["ANSWER_CONTRADICTS_WEBSITE"], "One answer does not match what the scan read on the firm’s website."],
  [["INCOMPLETE_SCORED_COVERAGE"], "Some areas were scored on fewer answers than planned."],
  [PUBLIC_EVIDENCE, "The quick scan could not gather all the public evidence, so that part of the score rests on less than usual."],
];

/** The sentences under "Notes for review", in a fixed order. Empty when no flag is one a visitor can act on. */
export function resultNotes(flags: readonly string[]): string[] {
  return NOTES.filter(
    ([codes]) =>
      codes.some((code) => flags.includes(code)) &&
      // The website notice already says the public evidence is missing.
      !(codes === PUBLIC_EVIDENCE && flags.includes(WEBSITE_UNAVAILABLE)),
  ).map(([, sentence]) => sentence);
}
