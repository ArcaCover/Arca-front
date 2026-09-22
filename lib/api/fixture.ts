import { Layer1Result } from "@arca/contracts";

// A complete Layer 1 result, parsed through the published contract so the fixture cannot
// drift away from what the API actually sends: if the shape changes, these tests fail
// loudly instead of testing a shape that no longer exists.

const source = (status: string) => ({ status, dataStatus: "PRESENT", durationMs: 1200 });

const rule = (id: string, points: number | null) => ({
  id,
  points,
  reason: points === null ? "Evidence unavailable or ambiguous" : "Evaluated from observed evidence",
});

export function fixtureResult(overrides: Record<string, unknown> = {}) {
  return Layer1Result.parse({
    scanId: "sc_fixture",
    domain: "smithlaw.com",
    email: "contact@smithlaw.com",
    preScore: {
      total: 82,
      categories: {
        aiGovernance: {
          score: 23, max: 35, status: "KNOWN",
          rules: [rule("W1", 8), rule("W2", 10), rule("W3", 0), rule("W4", 5)],
        },
        professionalStanding: {
          score: 30, max: 30, status: "KNOWN",
          rules: [rule("B1", 12), rule("B2_clean", 10), rule("B3", 5), rule("B4", 3), rule("B2_sanction", null)],
        },
        reputation: {
          score: 14, max: 20, status: "KNOWN",
          rules: [rule("A1", 9), rule("A3", 5), rule("A6", 0)],
        },
        firmMaturity: {
          score: 15, max: 15, status: "KNOWN",
          rules: [rule("W7", 3), rule("W6", 3), rule("W5a", 3), rule("W8", 3), rule("W9_A2", 3)],
        },
      },
      tier: "FORTRESS",
      decision: "AUTO_BIND",
      confidence: "HIGH",
      overrides: [],
      flags: [],
      assessmentStatus: "SUFFICIENT",
    },
    identity: {
      canonicalDomain: "smithlaw.com", firmName: "Smith Law", aliases: [], city: "Miami",
      county: "Miami-Dade", addressStreet: "100 Main St", phone: "305-555-0100",
      attorneyNames: ["Jane Smith"], status: "VERIFIED", evidence: [],
    },
    signals: {
      website: {
        W1_aiPolicy: { found: true, depth: "basic", points: 8 },
        W2_aiInServices: { found: true, tools: ["Harvey"], points: 10 },
        W3_aiDisclosure: { found: false, points: 0 },
        W4_aiBlog: { found: true, count: 2, points: 5 },
        W5_teamSize: 5, W5a_teamPageQuality: "detailed",
        W6_privacyPolicy: { found: true, mentionsClientData: true, points: 3 },
        W7_websiteQuality: "robust", W8_firmEstablished: 2008, W9_practiceAreas: ["Immigration"],
      },
      bar: {
        B1_allActive: true, B2_worstDisciplinary: "none", B3_consistency: 1,
        B4_avgExperience: 12, attorneys: [],
      },
      avvo: {
        A1_avgRating: 8.5, A1_ratingLevel: "Excellent", A2_practiceAreas: ["Immigration"],
        A3_avgReviewRating: 4.5, A3_totalReviews: 20, A6_hasAwards: false,
        A6_awardsCount: 0, A6_topAward: null, A8_disciplined: false,
      },
    },
    multipliers: {
      practiceArea: { area: "Immigration", value: 1.8, known: true },
      jurisdiction: { state: "FL", value: 1.25, known: true },
      size: { teamSize: 5, value: 1, known: true },
    },
    sources: { website: source("ok"), bar: source("ok"), avvo: source("ok") },
    meta: {
      scanDurationMs: 14520, cached: false, reusedEvidence: false,
      contractVersion: "layer1-2026-09-12-v2", completedAt: "2026-09-11T14:32:10.000Z",
    },
    ...overrides,
  });
}
