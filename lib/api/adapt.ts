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
  /** false: shown as context and not part of the score. Since bank 4.0 (contracts 0.6.0) that is Reputation. */
  scored: boolean;
};

/** Which of the three evidence cases /score tells the visitor about. `gaps` holds one plain
    sentence per kind of gap, and only for `limited`: an unreadable website is the one cause
    behind everything else that is missing, so it is said once. */
export type EvidenceView = {
  kind: "complete" | "limited" | "website_unavailable";
  gaps: string[];
};

/** Why /score shows no number and no tier. `website_unavailable`: the firm website could not be read at all, so there is
    no public evidence and the assessment scores the answers alone (DN-12 §14). `thin_evidence`: too little was seen to
    rate the firm (DN-12 §12). */
export type NotRatedView = { reason: "website_unavailable" } | { reason: "thin_evidence"; evaluated: number };

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
  evidence: EvidenceView;
  /** Layer 1 could not underwrite on this evidence, so no commercial decision is shown
      (CLAUDE.md §7: an insurer does not imply a decision it has not made). */
  decisionWithheld: boolean;
  /** Set when the score is withheld: the number and the tier are not shown, only why. Null when the firm is rated. */
  notRated: NotRatedView | null;
  /** The line that says Professional Standing covers Florida only, when some of the firm's attorneys are licensed
      elsewhere and were left out of the Florida Bar rules. Null otherwise. */
  floridaOnly: string | null;
};

type PreScore = Pick<Layer1Result["preScore"], "confidence" | "categories" | "flags">;

/** How many of the four Layer 1 categories the scan could evaluate, in full or in part. */
export function evaluatedAreas(preScore: PreScore): number {
  return Object.values(preScore.categories).filter(category => category.status !== "UNKNOWN").length;
}

/**
 * Too little evidence to present the score and tier as a judgement of the firm: low confidence and fewer than half of
 * the four categories evaluated. The live scan of hklaw.com printed 3 / 100, CRITICAL, from one partial category; that
 * was a gap in what we could see, not a verdict. An unreadable website (WEBSITE_UNAVAILABLE) is left to its sibling
 * state, which has its own words (`notRated.reason`). The Quick Scan PDF applies the same rule
 * (apps/api/src/report/quick-scan.ts in Arca-back).
 */
export function hasInsufficientEvidence(preScore: PreScore): boolean {
  return preScore.confidence === "LOW"
    && evaluatedAreas(preScore) < 2
    && !preScore.flags.includes("WEBSITE_UNAVAILABLE");
}

/** The API's flag for a firm with attorneys licensed outside Florida: they neither add to nor subtract from the Florida
    Bar rules (DN-12 §15 in Arca-back). */
export const ATTORNEYS_OUTSIDE_FLORIDA = "ATTORNEYS_OUTSIDE_FLORIDA";

// The API puts the count in the reason of rule B3, a free string of the contract, in this one sentence.
const OUTSIDE_COUNT = /(\d+) of (\d+) website attorneys are licensed outside /;

/** How many of the firm's attorneys the Florida Bar rules left out as licensed elsewhere, out of how many. Null without
    the flag or when the count cannot be read. The Quick Scan PDF reads it the same way (outsideBarState in @arca/scoring). */
export function attorneysOutsideFlorida(preScore: Pick<PreScore, "categories" | "flags">): { outside: number; total: number } | null {
  if (!preScore.flags.includes(ATTORNEYS_OUTSIDE_FLORIDA)) return null;
  const reason = preScore.categories.professionalStanding.rules.find(rule => rule.id === "B3")?.reason ?? "";
  const found = OUTSIDE_COUNT.exec(reason);
  return found ? { outside: Number(found[1]), total: Number(found[2]) } : null;
}

/** The line /score shows for that flag. The PDF says the same in the third person (FLORIDA_ONLY_NOTE in Arca-back). */
export function floridaOnlyNote(count: { outside: number; total: number } | null): string {
  return count
    ? `Professional Standing covers Florida only. ${count.outside} of your ${count.total} attorneys are licensed outside `
      + "Florida, so they were not scored against the Florida Bar."
    : "Professional Standing covers Florida only. Attorneys licensed outside Florida were not scored against the Florida Bar.";
}

/** The sentence that stands in for the score when it is not shown. The PDF prints the same words. */
export function notRatedSentence(evaluated: number): string {
  return evaluated === 0
    ? "We could not evaluate any of the 4 areas from public sources, so we are not showing a score."
    : `We could evaluate only ${evaluated} of 4 areas from public sources, so we are not showing a score.`;
}

/** The one notice /score shows when the firm website could not be read at all: low confidence, not high risk (DN-12 §14).
    The Quick Scan PDF says the same in the third person. */
export const WEBSITE_UNREAD_NOTICE = "We could not read your firm's website, so we have no public evidence to score. "
  + "The assessment below gives you a score based on your answers, marked as low confidence.";

/** Why there is no score, in one sentence: what the webapp cards print in the place of the number. */
export function notRatedText(notRated: NotRatedView): string {
  return notRated.reason === "website_unavailable"
    ? "We could not read your firm's website, so we have no public evidence to score."
    : notRatedSentence(notRated.evaluated);
}

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
  // The scan finished without every source answering, so the score rests on less evidence: it picks evidence.kind.
  const incomplete = status === "PARTIAL"
    || Object.values(sources).some(source => source.status !== "ok")
    || preScore.flags.includes("INCOMPLETE_SOURCES");

  const evidence = adaptEvidence(result, incomplete);

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
      return { key, label, score: category.score, max: category.max, status: category.status, scored: category.scored !== false };
    }),
    signals: signalsToCards(result),
    evidence,
    decisionWithheld: preScore.assessmentStatus === "INSUFFICIENT_EVIDENCE" || preScore.decision === "UNKNOWN",
    // An unreadable website comes first, also one that failed without the flag: there is no public evidence at all.
    notRated: evidence.kind === "website_unavailable"
      ? { reason: "website_unavailable" }
      : hasInsufficientEvidence(preScore)
        ? { reason: "thin_evidence", evaluated: evaluatedAreas(preScore) }
        : null,
    // An unreadable website has no Professional Standing to qualify.
    floridaOnly: preScore.flags.includes(ATTORNEYS_OUTSIDE_FLORIDA) && evidence.kind !== "website_unavailable"
      ? floridaOnlyNote(attorneysOutsideFlorida(preScore))
      : null,
  };
}
