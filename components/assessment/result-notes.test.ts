import { describe, expect, it } from "vitest";

import { resultNotes } from "./result-notes";

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

  it("leaves the missing public evidence to the website notice when the website could not be read", () => {
    expect(resultNotes(["INCOMPLETE_EVIDENCE", "INCOMPLETE_SOURCES", "NO_AI_POLICY", "WEBSITE_UNAVAILABLE"])).toEqual([
      "Your answers say the firm has no AI policy yet.",
    ]);
  });

  it("returns nothing for no flags", () => {
    expect(resultNotes([])).toEqual([]);
  });
});
