import type { Layer1Result } from "@arca/contracts";

import { signalsToCards, type SignalView } from "@/lib/signals-view";
import type { TierName } from "@/lib/score-tiers";

// Everything the /score screen renders, derived in one place so the null handling is written
// once and can be tested without a browser. Layer 1 leaves a field null whenever it could not
// observe it, and `identity` can be null outright, so almost nothing here is guaranteed.

export type CategoryView = {
  key: string;
  label: string;
  score: number | null;
  max: number;
  /** KNOWN, PARTIAL or UNKNOWN. A partial category scored only the rules it could evaluate. */
  status: string;
};

export type ScoreView = {
  firm: {
    name: string | null;
    city: string | null;
    state: string | null;
    attorneys: number | null;
    practice: string | null;
  };
  score: number | null;
  tier: TierName;
  confidence: string;
  categories: CategoryView[];
  signals: SignalView[];
  /** The scan finished without every source answering, so the score rests on less evidence. */
  incomplete: boolean;
  /** Layer 1 could not underwrite on this evidence, so no commercial decision is shown
      (CLAUDE.md §7: an insurer does not imply a decision it has not made). */
  decisionWithheld: boolean;
};

// The four categories Layer 1 measures, with the weight each carries. These are not the six
// Layer 2 domains: Layer 1 never observes oversight, training or incident preparedness.
const CATEGORIES: Array<{ key: keyof Layer1Result["preScore"]["categories"]; label: string }> = [
  { key: "aiGovernance", label: "AI Governance & Policy" },
  { key: "professionalStanding", label: "Professional Standing" },
  { key: "reputation", label: "Reputation" },
  { key: "firmMaturity", label: "Firm Maturity" },
];

export function adaptScore(result: Layer1Result, status: "COMPLETED" | "PARTIAL"): ScoreView {
  const { preScore, identity, signals, multipliers, sources } = result;

  return {
    firm: {
      // Falling back to the domain keeps the header honest when identity extraction failed:
      // it is the one thing we always know, because it is what was scanned.
      name: identity?.firmName ?? result.domain,
      city: identity?.city ?? null,
      state: multipliers.jurisdiction.known ? multipliers.jurisdiction.state : null,
      attorneys: signals.website.W5_teamSize,
      practice: multipliers.practiceArea.known ? multipliers.practiceArea.area : null,
    },
    score: preScore.total,
    tier: preScore.tier,
    confidence: preScore.confidence,
    categories: CATEGORIES.map(({ key, label }) => {
      const category = preScore.categories[key];
      return { key, label, score: category.score, max: category.max, status: category.status };
    }),
    signals: signalsToCards(result),
    incomplete: status === "PARTIAL"
      || Object.values(sources).some(source => source.status !== "ok")
      || preScore.flags.includes("INCOMPLETE_SOURCES"),
    decisionWithheld: preScore.assessmentStatus === "INSUFFICIENT_EVIDENCE" || preScore.decision === "UNKNOWN",
  };
}
