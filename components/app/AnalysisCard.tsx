import type { AnalysisView } from "@arca/contracts";

import { DomainBar, ScoreGauge, TierBadge } from "@/components/score";
import { adaptScore } from "@/lib/api/adapt";
import type { TierName } from "@/lib/score-tiers";

type Bar = { key: string; name: string; score: number | null; max?: number; caption?: string };

type Summary = { score: number | null; tier: TierName; bars: Bar[]; decisionWithheld: boolean };

// With an assessment, the combined score and the six domains, as /assessment/results shows them. A scan claimed without
// one keeps its Layer 1 score and four categories, as /score shows them.
export function summary({ assessment, layer1, scanStatus }: AnalysisView): Summary {
  if (assessment) {
    return {
      score: assessment.compositeScore,
      tier: assessment.tier,
      bars: assessment.domains.map(domain => ({
        key: domain.key,
        name: domain.label,
        score: domain.score,
        caption: `${domain.weight}% weight${domain.status === "PARTIAL" ? " · partial evidence" : ""}`,
      })),
      decisionWithheld: false,
    };
  }
  const scan = adaptScore(layer1, scanStatus);
  return {
    score: scan.score,
    tier: scan.tier,
    bars: scan.categories.map(category => ({ key: category.key, name: category.label, score: category.score, max: category.max })),
    decisionWithheld: scan.decisionWithheld,
  };
}

/** One claimed analysis, drawn with the funnel's own score components. */
export default function AnalysisCard({ analysis }: { analysis: AnalysisView }) {
  const { score, tier, bars, decisionWithheld } = summary(analysis);
  const plan = analysis.assessment?.actionPlan ?? [];

  return (
    <article className="rounded-3xl border border-marino/10 bg-white p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg">{analysis.domain}</h2>
        <p className="text-xs text-marino/70">
          {analysis.assessment ? "Scan and assessment" : "Scan only"}
          {analysis.scanStatus === "PARTIAL" && " · partial evidence"} · saved{" "}
          {new Date(analysis.claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
        </p>
      </header>
      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <div className="w-full max-w-[200px] shrink-0">
          <ScoreGauge score={score} tier={tier} />
          <div className="mt-3 text-center">
            <TierBadge tier={tier} />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {bars.map(({ key, ...bar }) => (
            <DomainBar key={key} {...bar} />
          ))}
        </div>
      </div>
      {decisionWithheld && (
        <p className="mt-5 text-xs text-marino/75">There is not enough evidence in this scan for a coverage decision on its own.</p>
      )}
      {plan.length > 0 && (
        <ol aria-label="Action plan" className="mt-5 list-decimal space-y-1 pl-5 text-sm">
          {plan.map(item => (
            <li key={item.id}>
              {item.title} <span className="text-xs text-marino/70">· up to +{item.pointsGain} demo points</span>
            </li>
          ))}
        </ol>
      )}
      {/* The same boundaries /assessment/results states: a saved analysis is no more of an offer than the funnel's. */}
      <p className="mt-5 text-xs text-marino/75">
        Scored with the demo scoring model. Commercial decisions are blocked for this demo, and this score does not establish
        eligibility for insurance.
      </p>
    </article>
  );
}
