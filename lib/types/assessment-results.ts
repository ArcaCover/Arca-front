// Contract for the completed assessment (Layer 2 output).
//
//   GET /assessment/{assessment_id}/results -> AssessmentResults
//
// Kept apart from lib/types/assessment.ts: that file describes the questions
// going out and the answers coming back, this one the score they produce.

export type DomainKey =
  | "governance"
  | "tools"
  | "oversight"
  | "data_protection"
  | "training"
  | "incident_preparedness";

/** Whether a domain is carrying the score or dragging on it. There is no
    "critical" here on purpose: rojo is reserved for errors (CLAUDE.md §5). */
export type DomainStatus = "good" | "warning";

export type UnderwritingDecision =
  | "AUTO_BIND"
  | "REFERRAL"
  | "REFERRAL_SENIOR"
  | "DECLINE";

export interface ResultsFirm {
  name: string;
  domain: string;
  city: string;
  state: string;
  attorneys_count: number;
  practice_areas: string[];
  primary_practice: string;
}

export interface DomainResult {
  score: number;
  label: string;
  status: DomainStatus;
  /** The domain's share of the composite score, per CLAUDE.md §6.3. */
  weight: string;
}

export interface ActionPlanItem {
  priority: number;
  action: string;
  domain: DomainKey;
  score_impact: number;
  /** Where the composite score lands once this and every higher priority
      before it are done — cumulative, not standalone. */
  projected_score: number;
  premium_impact_percent: number;
}

export interface PricingOption {
  name: string;
  limit_per_claim: number;
  limit_aggregate: number;
  annual_premium: number;
  monthly_premium: number;
  recommended?: boolean;
}

export interface AssessmentResults {
  assessment_id: string;
  firm: ResultsFirm;
  composite_score: number;
  tier: string;
  decision: UnderwritingDecision;
  benchmark_percentile: number;
  benchmark_segment: string;
  domain_scores: Record<DomainKey, DomainResult>;
  action_plan: ActionPlanItem[];
  pricing: { options: PricingOption[] };
}
