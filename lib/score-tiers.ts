// Tier bands and their colours. Both the gauge and the badge need them, so the
// rule is written once here. Source of truth for the bands: CLAUDE.md §6.3.

export type Tier = 1 | 2 | 3 | 4 | 5;

export type TierStyle = {
  name: string;
  // Full Tailwind class names on purpose: the scanner cannot see a class that
  // is assembled from pieces at runtime.
  stroke: string;
  text: string;
  background: string;
};

const TIER_STYLES: Record<Tier, TierStyle> = {
  1: {
    name: "FORTRESS",
    stroke: "stroke-cielo",
    text: "text-cielo",
    background: "bg-cielo/15",
  },
  2: {
    name: "FORTIFIED",
    stroke: "stroke-cielo/80",
    text: "text-cielo/80",
    background: "bg-cielo/15",
  },
  3: {
    name: "GUARDED",
    stroke: "stroke-oro",
    text: "text-oro",
    background: "bg-oro/15",
  },
  4: {
    name: "EXPOSED",
    stroke: "stroke-oro-oscuro",
    text: "text-oro-oscuro",
    background: "bg-oro-oscuro/15",
  },
  5: {
    name: "CRITICAL",
    stroke: "stroke-rojo",
    text: "text-rojo",
    background: "bg-rojo/15",
  },
};

export function tierForScore(score: number): Tier {
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 50) return 3;
  if (score >= 30) return 4;
  return 5;
}

export function tierStyle(tier: Tier): TierStyle {
  return TIER_STYLES[tier];
}
