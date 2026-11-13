import { fixtureResult } from "@/lib/api/fixture";

const unknown = (max: number, rules: string[]) => ({
  score: null, max, status: "UNKNOWN",
  rules: rules.map(id => ({ id, points: null, reason: "Evidence unavailable or ambiguous" })),
});

/**
 * The shape of the live scan of hklaw.com: only Professional Standing could be evaluated, and only in part, so the
 * engine printed 3 / 100, CRITICAL, with low confidence. The website was read; Avvo was never searched.
 */
export function thinEvidenceResult(overrides: Record<string, unknown> = {}) {
  const base = fixtureResult();
  return fixtureResult({
    domain: "hklaw.example",
    preScore: {
      total: 3,
      categories: {
        aiGovernance: unknown(35, ["W1", "W2", "W3", "W4"]),
        professionalStanding: {
          score: 3, max: 30, status: "PARTIAL",
          rules: [
            { id: "B1", points: 3, reason: "Evaluated from observed evidence" },
            { id: "B2_clean", points: null, reason: "Evidence unavailable or ambiguous" },
            { id: "B3", points: null, reason: "Evidence unavailable or ambiguous" },
            { id: "B4", points: null, reason: "Evidence unavailable or ambiguous" },
          ],
        },
        reputation: unknown(20, ["A1", "A3", "A6"]),
        firmMaturity: unknown(15, ["W7", "W6", "W5a", "W8", "W9_A2"]),
      },
      tier: "CRITICAL",
      decision: "UNKNOWN",
      confidence: "LOW",
      overrides: [],
      flags: ["INCOMPLETE_SOURCES", "INCOMPLETE_EVIDENCE", "COMMERCIAL_DECISION_BLOCKED"],
      assessmentStatus: "INSUFFICIENT_EVIDENCE",
    },
    sources: {
      website: { ...base.sources.website, status: "partial", code: "DEADLINE_REACHED" },
      bar: base.sources.bar,
      avvo: { status: "skipped", dataStatus: "UNKNOWN", durationMs: 0, code: "INSUFFICIENT_IDENTITY" },
    },
    ...overrides,
  });
}
