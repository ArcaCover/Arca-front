import {
  AlertOctagon,
  AlertTriangle,
  Shield,
  ShieldCheck,
  XOctagon,
  type LucideIcon,
} from "lucide-react";

import { tierStyle, type Tier } from "@/lib/score-tiers";

const TIER_ICONS: Record<Tier, LucideIcon> = {
  1: ShieldCheck,
  2: Shield,
  3: AlertTriangle,
  4: AlertOctagon,
  5: XOctagon,
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const { name, text, background } = tierStyle(tier);
  const Icon = TIER_ICONS[tier];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold tracking-wide ${background} ${text}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      {name}
    </span>
  );
}
