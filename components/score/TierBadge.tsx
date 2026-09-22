import {
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  Shield,
  ShieldCheck,
  XOctagon,
  type LucideIcon,
} from "lucide-react";

import { tierStyle, type TierName } from "@/lib/score-tiers";

const TIER_ICONS: Record<TierName, LucideIcon> = {
  FORTRESS: ShieldCheck,
  FORTIFIED: Shield,
  GUARDED: AlertTriangle,
  EXPOSED: AlertOctagon,
  CRITICAL: XOctagon,
  UNKNOWN: HelpCircle,
};

export default function TierBadge({ tier }: { tier: TierName }) {
  const { name, icon, background } = tierStyle(tier);
  const Icon = TIER_ICONS[tier];

  // The label stays marino: cielo and oro are light colours, and as text over
  // a tint of themselves they fall to 1.5-2.2:1 against the 4.5:1 minimum.
  // The tier keeps its colour in the icon and the background.
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold tracking-wide text-marino ${background}`}
    >
      <Icon className={`h-4 w-4 ${icon}`} strokeWidth={2.25} aria-hidden />
      {name}
    </span>
  );
}
