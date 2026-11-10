import { describe, expect, it } from "vitest";

import { resultNotes, websiteNotice } from "./result-notes";

describe("resultNotes", () => {
  it("words each flag a visitor can act on, in a fixed order whatever order the API sends", () => {
    expect(resultNotes(["NO_HUMAN_REVIEW", "NO_DATA_SAFEGUARDS", "NO_CITATION_REVIEW", "NO_AI_POLICY", "CONSUMER_AI_IN_CLIENT_WORK", "ANSWER_CONTRADICTS_WEBSITE", "INCOMPLETE_SCORED_COVERAGE"])).toEqual([
      "Your answers say the firm has no AI policy yet.",
      "Free or personal AI accounts are used for client work.",
      "AI-assisted work reaches clients without a lawyer’s review.",
      "AI-generated citations are not checked consistently.",
      "No consistent safeguards protect client information in AI tools.",
      "One answer does not match what the scan read on the firm’s website.",
      "Some areas were scored on fewer answers than planned.",
    ]);
  });

  it.each([
    "PROVIDER_COST_UNKNOWN", "DEMO_BANK_NOT_APPROVED", "DEMO_COMPOSITE_FORMULA", "COMMERCIAL_DECISION_BLOCKED",
    "PARTIAL_ATTORNEY_DATA", "LOW_BAR_CONSISTENCY", "AMBIGUOUS_IDENTITY_MATCH", "NON_ACTIVE_ATTORNEY",
    "DISCIPLINARY_DETAILS_UNKNOWN", "DEMO_ASSESSMENT", "SOME_FUTURE_FLAG", "constructor", "toString", "",
  ])("renders nothing for %s", flag => {
    expect(resultNotes([flag])).toEqual([]);
  });

  it("says once that the public evidence was incomplete, however many flags say it", () => {
    expect(resultNotes(["INCOMPLETE_EVIDENCE", "INCOMPLETE_SOURCES", "INSUFFICIENT_EVIDENCE"])).toEqual([
      "The quick scan could not gather all the public evidence, so that part of the score rests on less than usual.",
    ]);
  });

  // The minimal profile: every source answered, but what they showed was thin. /score says all three answered, so the
  // note must not suggest a collection failure.
  it.each([
    [["INCOMPLETE_EVIDENCE", "INSUFFICIENT_EVIDENCE"]],
    [["INCOMPLETE_EVIDENCE"]],
    [["INSUFFICIENT_EVIDENCE"]],
  ])("says the evidence was limited, not that a source failed, for %j", flags => {
    expect(resultNotes(flags)).toEqual([
      "The public evidence about the firm was limited, so that part of the score rests on less than usual.",
    ]);
  });

  it("leaves the missing public evidence to the website notice when the website could not be read", () => {
    expect(resultNotes(["INCOMPLETE_EVIDENCE", "INCOMPLETE_SOURCES", "NO_AI_POLICY", "WEBSITE_UNAVAILABLE"])).toEqual([
      "Your answers say the firm has no AI policy yet.",
    ]);
    expect(resultNotes(["INSUFFICIENT_EVIDENCE", "WEBSITE_UNAVAILABLE"])).toEqual([]);
  });

  it("returns nothing for no flags", () => {
    expect(resultNotes([])).toEqual([]);
  });
});

// The API takes the tier from the combined score, so the answers can move the group; only the manual review holds
// whatever they show. The back's assessment PDF prints the same sentences.
describe("websiteNotice", () => {
  it("names the highest-risk group as where the outlook is, and holds only the manual review whatever the answers", () => {
    expect(websiteNotice("CRITICAL")).toBe(
      "We could not read your firm's website during the scan. This outlook is in the highest-risk group, and because the "
      + "website could not be read, it needs a manual review whatever your answers show. "
      + "This is not a coverage decision or a price.",
    );
  });

  it.each(["FORTRESS", "FORTIFIED", "GUARDED", "EXPOSED", "UNKNOWN"] as const)("keeps only the manual review for %s", tier => {
    const notice = websiteNotice(tier);
    expect(notice).toBe(
      "We could not read your firm's website during the scan. Until it can be read, this outlook needs a manual review, "
      + "whatever your answers show. This is not a coverage decision or a price.",
    );
    expect(notice).not.toMatch(/highest-risk/);
  });
});
