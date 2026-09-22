// Tier names and their colours. Keyed by the tier name the API sends, not by a number we
// derive: the API owns the banding, and a gauge that re-derived it could disagree with the
// badge beside it.

export type TierName =
  | "FORTRESS"
  | "FORTIFIED"
  | "GUARDED"
  | "EXPOSED"
  | "CRITICAL"
  | "UNKNOWN";

export type TierStyle = {
  name: string;
  // Full Tailwind class names on purpose: the scanner cannot see a class that
  // is assembled from pieces at runtime.
  stroke: string;
  icon: string;
  background: string;
};

const TIER_STYLES: Record<TierName, TierStyle> = {
  FORTRESS: {
    name: "FORTRESS",
    stroke: "stroke-cielo",
    icon: "text-cielo",
    background: "bg-cielo/15",
  },
  FORTIFIED: {
    name: "FORTIFIED",
    stroke: "stroke-cielo/80",
    icon: "text-cielo/80",
    background: "bg-cielo/15",
  },
  GUARDED: {
    name: "GUARDED",
    stroke: "stroke-oro",
    icon: "text-oro",
    background: "bg-oro/15",
  },
  EXPOSED: {
    name: "EXPOSED",
    stroke: "stroke-oro-oscuro",
    icon: "text-oro-oscuro",
    background: "bg-oro-oscuro/15",
  },
  CRITICAL: {
    name: "CRITICAL",
    stroke: "stroke-rojo",
    icon: "text-rojo",
    background: "bg-rojo/15",
  },
  // Not an error, so not rojo (CLAUDE.md §5): the evidence simply did not support a tier.
  UNKNOWN: {
    name: "NOT SCORED",
    stroke: "stroke-marino/30",
    icon: "text-marino/50",
    background: "bg-marino/10",
  },
};

export function tierStyle(tier: TierName): TierStyle {
  return TIER_STYLES[tier];
}

/**
 * Bands owned by the Score Engine (`packages/scoring/src/math.ts`): 80/65/45/25.
 *
 * Only for the Layer 2 mock on /assessment/results, which has no API behind it yet. Never
 * use this for a Layer 1 result — there the tier arrives in the payload, and recomputing it
 * here is exactly how the badge and the gauge drift apart.
 */
export function tierForScore(score: number): TierName {
  if (score >= 80) return "FORTRESS";
  if (score >= 65) return "FORTIFIED";
  if (score >= 45) return "GUARDED";
  if (score >= 25) return "EXPOSED";
  return "CRITICAL";
}
