import { describe, expect, it } from "vitest";

import { adaptScore, evaluatedAreas, hasInsufficientEvidence } from "@/lib/api/adapt";
import { fixtureResult } from "@/lib/api/fixture";
import { thinEvidenceResult } from "@/lib/test-fixtures/layer1";

describe("adaptScore", () => {
  it("shows the four categories Layer 1 measures, against their own ceilings", () => {
    const view = adaptScore(fixtureResult(), "COMPLETED");

    expect(view.categories).toEqual([
      { key: "aiGovernance", label: "AI Governance & Policy", score: 23, max: 35, status: "KNOWN" },
      { key: "professionalStanding", label: "Professional Standing", score: 30, max: 30, status: "KNOWN" },
      { key: "reputation", label: "Reputation", score: 14, max: 20, status: "KNOWN" },
      { key: "firmMaturity", label: "Firm Maturity", score: 15, max: 15, status: "KNOWN" },
    ]);
  });

  it("takes the tier from the payload instead of deriving it from the score", () => {
    // 82 would be FORTIFIED under the old frontend bands. The API says FORTRESS, and the
    // API wins: recomputing here is how the badge and the gauge drift apart.
    const view = adaptScore(fixtureResult(), "COMPLETED");
    expect(view.score).toBe(82);
    expect(view.tier).toBe("FORTRESS");
  });

  it("falls back to the scanned domain when identity extraction found no firm name", () => {
    const view = adaptScore(fixtureResult({ identity: null }), "COMPLETED");

    expect(view.firm.name).toBe("smithlaw.com");
    expect(view.firm.city).toBeNull();
    // The state comes from the multipliers, which survive a missing identity.
    expect(view.firm.state).toBe("FL");
  });

  it("survives a result with no score, no tier and nothing known", () => {
    const result = fixtureResult();
    const view = adaptScore(
      fixtureResult({
        preScore: {
          ...result.preScore,
          total: null,
          tier: "UNKNOWN",
          decision: "UNKNOWN",
          confidence: "LOW",
          assessmentStatus: "INSUFFICIENT_EVIDENCE",
        },
        identity: null,
        multipliers: {
          practiceArea: { area: null, value: 1, known: false },
          jurisdiction: { state: null, value: 1, known: false },
          size: { teamSize: null, known: false, value: 1 },
        },
      }),
      "PARTIAL",
    );

    expect(view.score).toBeNull();
    expect(view.tier).toBe("UNKNOWN");
    expect(view.firm.practice).toBeNull();
    expect(view.firm.state).toBeNull();
    expect(view.decisionWithheld).toBe(true);
    expect(view.evidence.kind).toBe("limited");
  });

  it("marks a completed scan's evidence as limited when a source did not answer", () => {
    const result = fixtureResult();
    const view = adaptScore(
      fixtureResult({
        sources: {
          ...result.sources,
          avvo: { status: "error", dataStatus: "UNKNOWN", durationMs: 40, code: "PROVIDER_ERROR" },
        },
      }),
      "COMPLETED",
    );

    expect(view.evidence.kind).toBe("limited");
    // The page reads the evidence, not a separate flag.
    expect(view).not.toHaveProperty("incomplete");
    // Evidence was thin, but the engine still underwrote it, so nothing is withheld.
    expect(view.decisionWithheld).toBe(false);
  });
});

describe("adaptScore evidence", () => {
  const base = fixtureResult();
  const skipped = { status: "skipped", dataStatus: "UNKNOWN", durationMs: 0, code: "INSUFFICIENT_IDENTITY" };
  const failed = { status: "error", dataStatus: "UNKNOWN", durationMs: 40, code: "PROVIDER_ERROR" };
  const withSources = (sources: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
    fixtureResult({ sources: { ...base.sources, ...sources }, ...overrides });

  it("is complete when every source answered, including a directory that found no match", () => {
    const noMatch = { status: "ok", dataStatus: "EMPTY", durationMs: 900, code: "NO_MATCH" };

    expect(adaptScore(base, "COMPLETED").evidence).toEqual({ kind: "complete", gaps: [] });
    expect(adaptScore(withSources({ avvo: noMatch }), "COMPLETED").evidence).toEqual({ kind: "complete", gaps: [] });
  });

  it("keeps a withheld decision apart from the sources, so it shows when all of them answered", () => {
    const view = adaptScore(
      fixtureResult({ preScore: { ...base.preScore, decision: "UNKNOWN", assessmentStatus: "INSUFFICIENT_EVIDENCE" } }),
      "COMPLETED",
    );

    expect(view.evidence.kind).toBe("complete");
    expect(view.decisionWithheld).toBe(true);
  });

  it("says in plain words what each missing source did", () => {
    expect(adaptScore(withSources({ avvo: skipped }), "PARTIAL").evidence).toEqual({
      kind: "limited", gaps: ["We could not look your firm up on Avvo."],
    });
    expect(adaptScore(withSources({ bar: skipped, avvo: skipped }), "PARTIAL").evidence.gaps).toEqual([
      "We could not look your firm up in the Florida Bar register or on Avvo.",
    ]);
    expect(adaptScore(withSources({ bar: failed, avvo: { ...failed, status: "timeout" } }), "PARTIAL").evidence.gaps).toEqual([
      "The Florida Bar register and Avvo did not answer.",
    ]);
    expect(adaptScore(withSources({
      website: { ...base.sources.website, status: "partial" },
      bar: failed,
      avvo: { ...base.sources.avvo, status: "partial", code: "TRUNCATED" },
    }), "PARTIAL").evidence.gaps).toEqual([
      "We could only read part of your website.",
      "The Florida Bar register did not answer.",
      "Avvo answered only in part.",
    ]);
  });

  it("is limited, with nothing to name, for a partial scan whose sources all report as read", () => {
    expect(adaptScore(base, "PARTIAL").evidence).toEqual({ kind: "limited", gaps: [] });
    expect(adaptScore(fixtureResult({ preScore: { ...base.preScore, flags: ["INCOMPLETE_SOURCES"] } }), "COMPLETED").evidence.kind)
      .toBe("limited");
  });

  it("reports an unreadable website as its own case, from the flag or from the source", () => {
    const flagged = fixtureResult({ preScore: { ...base.preScore, flags: ["INCOMPLETE_SOURCES", "WEBSITE_UNAVAILABLE"] } });
    const blocked = withSources({ website: { ...failed, code: "ACCESS_BLOCKED" }, bar: skipped, avvo: skipped });

    expect(adaptScore(flagged, "PARTIAL").evidence).toEqual({ kind: "website_unavailable", gaps: [] });
    // The directories were skipped only because the website was not read: one cause, one sentence.
    expect(adaptScore(blocked, "PARTIAL").evidence).toEqual({ kind: "website_unavailable", gaps: [] });
    expect(adaptScore(withSources({ website: { ...failed, status: "timeout" } }), "PARTIAL").evidence.kind).toBe("website_unavailable");
  });
});

describe("hasInsufficientEvidence", () => {
  const thin = thinEvidenceResult();
  const known = { ...thin.preScore.categories.reputation, score: 14, status: "KNOWN" as const };

  it("is true for the hklaw.com shape: low confidence and only one category, partly, evaluated", () => {
    expect(evaluatedAreas(thin.preScore)).toBe(1);
    expect(hasInsufficientEvidence(thin.preScore)).toBe(true);
  });

  it("is true when no category could be evaluated at all", () => {
    const none = { ...thin.preScore, categories: { ...thin.preScore.categories,
      professionalStanding: { ...thin.preScore.categories.reputation, max: 30 } } };
    expect(evaluatedAreas(none)).toBe(0);
    expect(hasInsufficientEvidence(none)).toBe(true);
  });

  it("is false once two categories are known or partial, even with low confidence", () => {
    const two = { ...thin.preScore, categories: { ...thin.preScore.categories, reputation: known } };
    expect(evaluatedAreas(two)).toBe(2);
    expect(hasInsufficientEvidence(two)).toBe(false);
  });

  it("is false when confidence is not low, however few categories were evaluated", () => {
    expect(hasInsufficientEvidence({ ...thin.preScore, confidence: "MEDIUM" })).toBe(false);
  });

  it("is false with the website-unavailable flag, which keeps its own highest-risk treatment", () => {
    expect(hasInsufficientEvidence({ ...thin.preScore, flags: [...thin.preScore.flags, "WEBSITE_UNAVAILABLE"] })).toBe(false);
  });

  it("is false for a fully read firm", () => {
    expect(hasInsufficientEvidence(fixtureResult().preScore)).toBe(false);
  });
});

describe("adaptScore with too little evidence to rate", () => {
  it("withholds the rating and counts the areas it could evaluate", () => {
    const view = adaptScore(thinEvidenceResult(), "PARTIAL");

    expect(view.notRated).toEqual({ evaluated: 1 });
    // The breakdown still shows what was and was not seen.
    expect(view.categories.map(category => category.status)).toEqual(["UNKNOWN", "PARTIAL", "UNKNOWN", "UNKNOWN"]);
  });

  it("rates a firm as before when the evidence is enough", () => {
    expect(adaptScore(fixtureResult(), "COMPLETED").notRated).toBeNull();
  });

  it("leaves an unreadable website to its own notice, even when the website failed without the flag", () => {
    const thin = thinEvidenceResult();
    const failed = { status: "error", dataStatus: "UNKNOWN", durationMs: 40, code: "NO_READABLE_EVIDENCE" };
    const unread = thinEvidenceResult({ sources: { ...thin.sources, website: failed } });

    expect(adaptScore(unread, "PARTIAL").evidence.kind).toBe("website_unavailable");
    expect(adaptScore(unread, "PARTIAL").notRated).toBeNull();
  });
});
