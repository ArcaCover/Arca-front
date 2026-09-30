import { describe, expect, it } from "vitest";

import { adaptScore } from "@/lib/api/adapt";
import { fixtureResult } from "@/lib/api/fixture";

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
    expect(view.incomplete).toBe(true);
  });

  it("marks a completed scan as incomplete when a source did not answer", () => {
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

    expect(view.incomplete).toBe(true);
    // Evidence was thin, but the engine still underwrote it, so nothing is withheld.
    expect(view.decisionWithheld).toBe(false);
  });
});
