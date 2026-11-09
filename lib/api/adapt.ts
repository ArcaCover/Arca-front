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

/** Which of the three evidence cases /score tells the visitor about. `gaps` holds one plain
    sentence per kind of gap, and only for `limited`: an unreadable website is the one cause
    behind everything else that is missing, so it is said once. */
export type EvidenceView = {
  kind: "complete" | "limited" | "website_unavailable";
  gaps: string[];
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
  evidence: EvidenceView;
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

// How each directory reads in a sentence: as its subject, and after "look your firm up".
const DIRECTORIES = [
  { key: "bar", name: "the Florida Bar register", where: "in the Florida Bar register" },
  { key: "avvo", name: "Avvo", where: "on Avvo" },
] as const;

const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;

// Copy, like signals-view.ts: the source statuses are the API's, the words are ours. The API's
// own codes and reasons are written for operators and never reach the visitor.
function adaptEvidence(result: Layer1Result, incomplete: boolean): EvidenceView {
  const { sources, preScore } = result;
  const websiteRead = sources.website.status === "ok" || sources.website.status === "partial";
  if (preScore.flags.includes("WEBSITE_UNAVAILABLE") || !websiteRead) return { kind: "website_unavailable", gaps: [] };

  const directories = (wanted: (status: string) => boolean) =>
    DIRECTORIES.filter(({ key }) => wanted(sources[key].status));
  const unanswered = directories(status => status === "error" || status === "timeout");
  const partlyRead = directories(status => status === "partial");
  const notSearched = directories(status => status === "skipped");
  const gaps = [
    sources.website.status === "partial" ? "We could only read part of your website." : null,
    unanswered.length ? sentence(`${unanswered.map(({ name }) => name).join(" and ")} did not answer`) : null,
    partlyRead.length ? sentence(`${partlyRead.map(({ name }) => name).join(" and ")} answered only in part`) : null,
    notSearched.length ? sentence(`we could not look your firm up ${notSearched.map(({ where }) => where).join(" or ")}`) : null,
  ].filter((gap): gap is string => gap !== null);

  return { kind: incomplete ? "limited" : "complete", gaps };
}

export function adaptScore(result: Layer1Result, status: "COMPLETED" | "PARTIAL"): ScoreView {
  const { preScore, identity, signals, multipliers, sources } = result;
  const incomplete = status === "PARTIAL"
    || Object.values(sources).some(source => source.status !== "ok")
    || preScore.flags.includes("INCOMPLETE_SOURCES");

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
    incomplete,
    evidence: adaptEvidence(result, incomplete),
    decisionWithheld: preScore.assessmentStatus === "INSUFFICIENT_EVIDENCE" || preScore.decision === "UNKNOWN",
  };
}
