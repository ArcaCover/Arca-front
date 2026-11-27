import type { AssessmentView, LegacyAssessmentResult, RenderedQuestion, UnderwritingResult } from "@arca/contracts";

/** Synthetic payloads for unit tests, matching the shared API contract. */
export function fixtureQuestion(overrides: Partial<RenderedQuestion> = {}): RenderedQuestion {
  return {
    id: "governance.policy", domain: "governance", domainLabel: "Governance",
    type: "single_select", text: "Is there a written AI policy?", help: null,
    context: null, scored: true,
    evidence: [{ id: "policy", signal: "W1_aiPolicy", value: true, text: "A policy was found.", sourceUrl: "https://firm.example/policy" }],
    options: [
      { id: "yes", label: "Yes", exclusive: false },
      { id: "no", label: "No", exclusive: false },
      { id: "unknown", label: "Not sure", exclusive: true },
    ],
    scale: null, number: null, suggestedAnswer: null,
    ...overrides,
  };
}

export function fixtureAssessment(overrides: Partial<AssessmentView> = {}): AssessmentView {
  return {
    assessmentId: "as_demo", scanId: "sc_demo", status: "READY",
    bankVersion: "demo-v1", bankStatus: "DEMO", planner: "rules", intro: null,
    expiresAt: "2026-10-14T03:00:00.000Z", sessionScope: "CURRENT_TAB_24H",
    questions: [fixtureQuestion()], answers: {}, skipped: [],
    progress: { answered: 0, total: 1 }, estimatedMinutes: 5,
    ...overrides,
  };
}

/** A result of the demo bank, before bank 4.0; stored ones stay readable. */
export function fixtureAssessmentResult(overrides: Partial<LegacyAssessmentResult> = {}): LegacyAssessmentResult {
  const domains = ["governance", "tools", "oversight", "data_protection", "training", "incident_preparedness"] as const;
  return {
    assessmentId: "as_demo", scanId: "sc_demo", bankVersion: "demo-v1", bankStatus: "DEMO",
    scoringVersion: "scoring-demo-v1", commercialDecisionBlocked: true,
    layer1Score: 82, layer2Score: 60, compositeScore: 70,
    tier: "GUARDED", decision: "REFERRAL",
    domains: domains.map(key => ({ key, label: key, weight: 1, score: 60, status: "KNOWN" })),
    flags: ["DEMO_ASSESSMENT"],
    actionPlan: [{ id: "policy", domain: "governance", title: "Document the policy", detail: "Create a written policy.", pointsGain: 5 }],
    completedAt: "2026-10-13T04:00:00.000Z",
    ...overrides,
  };
}

/** A bank 4.0 result (DN-14 in Arca-back), as the firm receives it: no audit, no underwriter summary. */
export function fixtureUnderwritingResult(overrides: Partial<UnderwritingResult> = {}): UnderwritingResult {
  return {
    assessmentId: "as_demo", scanId: "sc_demo", bankVersion: "4.0", bankStatus: "PROVISIONAL", configVersion: "1.1.0",
    scoringVersion: "underwriting-4.0-engine-1", completed: true, layer1Score: 86.29, compositeScore: 84, tier: "FORTRESS",
    categories: [
      { key: "ai_data_governance", label: "AI & Data Governance", max: 40, layer1: 26.29, layer2: 10, score: 36.29 },
      { key: "professional_standing", label: "Professional Standing", max: 35, layer1: 35, layer2: 10, score: 35 },
      { key: "firm_maturity", label: "Firm Maturity", max: 25, layer1: 12.71, layer2: 0, score: 12.71 },
    ],
    confidence: { level: "HIGH", startedAt: "HIGH", downgrades: [], contradictions: [] },
    exposure: { usageProfile: "P3", sizeBand: "Small", areaBand: "High", level: "E2", autoBindThreshold: 78, conditionsThreshold: 62 },
    outcome: { type: "quote", quote: { currency: "USD", indicative: true, defaultLimit: 1000000,
      limits: [{ limit: 250000, annualPremium: 8895 }, { limit: 1000000, annualPremium: 12707 }, { limit: 2000000, annualPremium: 17154 }],
      buildUp: { attorneys: 5, supportStaff: 6, attorneyCountAssumed: false, peopleCountLowerBound: false, exposureUnits: 6.5,
        ratedUnits: 6.275, ratePerUnit: 1200, areaFactor: 1.8, riskFactor: 0.854, confidenceLoad: 1, limitFactor: 1,
        jurisdictionFactor: 1.25, minimumApplied: false },
      conditions: [] } },
    reputationContext: { avvoRating: 8.5, reviewCount: 20, awards: false },
    actionPlan: [{ id: "improve:P3-1", domain: "ai_data_governance", title: "When the software helps with legal work, does a lawyer review all of it before it goes out?",
      detail: "Next step: Always, no exception.", pointsGain: 3.71 }],
    flags: ["PROVISIONAL_RATES"], audit: null, underwriterSummary: null, completedAt: "2026-11-27T12:00:00.000Z",
    ...overrides,
  };
}
