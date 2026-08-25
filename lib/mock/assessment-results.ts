// TODO: replace with API call to GET /assessment/{assessment_id}/results
// Response shape defined in lib/types/assessment-results.ts.
//
// Illustrative only. Every premium below is a placeholder: there is no carrier
// and no rate filing behind them, which is why both pages that read this file
// carry a visible disclaimer (CLAUDE.md §7).

import type { AssessmentResults } from "@/lib/types/assessment-results";

export const MOCK_ASSESSMENT_RESULTS: AssessmentResults = {
  assessment_id: "mock-assessment-001",
  firm: {
    name: "Smith & Associates",
    domain: "smithlawmiami.com",
    city: "Miami",
    state: "FL",
    attorneys_count: 10,
    practice_areas: ["litigation", "criminal_defense"],
    primary_practice: "criminal_defense",
  },
  // 74 falls in the 70-84 band, which CLAUDE.md §6.3 calls FORTIFIED and
  // clears for AUTO_BIND. The tier string is what the API will send; the
  // pages derive their own from the score so the two cannot drift.
  composite_score: 74,
  tier: "FORTIFIED",
  decision: "AUTO_BIND",
  benchmark_percentile: 78,
  benchmark_segment: "criminal defense firms in Florida",
  // Weights are the real ones from CLAUDE.md §6.3, not placeholders.
  domain_scores: {
    governance: { score: 80, label: "AI Governance & Policy", status: "good", weight: "25%" },
    tools: { score: 65, label: "AI Tool Environment", status: "warning", weight: "20%" },
    oversight: { score: 90, label: "Human Oversight & Review", status: "good", weight: "20%" },
    data_protection: {
      score: 60,
      label: "Data Protection & Confidentiality",
      status: "warning",
      weight: "15%",
    },
    training: { score: 90, label: "Training & Competency", status: "good", weight: "10%" },
    incident_preparedness: {
      score: 70,
      label: "Incident Preparedness",
      status: "good",
      weight: "10%",
    },
  },
  // projected_score accumulates: 74 -> 82 -> 88 -> 91.
  action_plan: [
    {
      priority: 1,
      action: "Migrate from ChatGPT Team to CoCounsel or another enterprise legal AI tool",
      domain: "tools",
      score_impact: 8,
      projected_score: 82,
      premium_impact_percent: -12,
    },
    {
      priority: 2,
      action: "Implement technical data protection controls (DLP for privileged data)",
      domain: "data_protection",
      score_impact: 6,
      projected_score: 88,
      premium_impact_percent: -18,
    },
    {
      priority: 3,
      action: "Document and rehearse the incident response plan",
      domain: "incident_preparedness",
      score_impact: 3,
      projected_score: 91,
      premium_impact_percent: -22,
    },
  ],
  // The three limit options from CLAUDE.md §6.3, priced off Professional:
  // Essential is 0.60x and Complete 1.85x its annual premium. Monthly figures
  // round up — an insurer never bills short.
  pricing: {
    options: [
      {
        name: "Essential",
        limit_per_claim: 50000,
        limit_aggregate: 100000,
        annual_premium: 6578,
        monthly_premium: 548,
      },
      {
        name: "Professional",
        limit_per_claim: 250000,
        limit_aggregate: 500000,
        annual_premium: 10963,
        monthly_premium: 914,
        recommended: true,
      },
      {
        name: "Complete",
        limit_per_claim: 1000000,
        limit_aggregate: 2000000,
        annual_premium: 20282,
        monthly_premium: 1691,
      },
    ],
  },
};
