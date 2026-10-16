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
