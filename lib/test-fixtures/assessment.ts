import type { AssessmentResult, AssessmentView, RenderedQuestion } from "@arca/contracts";

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

export function fixtureAssessmentResult(overrides: Partial<AssessmentResult> = {}): AssessmentResult {
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
