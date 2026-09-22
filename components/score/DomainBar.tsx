export default function DomainBar({
  name,
  score,
  max = 100,
  caption,
}: {
  name: string;
  score: number | null;
  /** Layer 1 categories are scored out of their own ceiling (35/30/20/15), not out of 100. */
  max?: number;
  /** The small grey note beside the name: a weight on Layer 2, evidence status on Layer 1. */
  caption?: string;
}) {
  const value = score === null ? null : Math.min(max, Math.max(0, Math.round(score)));
  const fill = value === null ? 0 : (value / max) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-marino">
          {name} {caption && <span className="text-xs text-marino/45">{caption}</span>}
        </p>
        <span className="text-sm font-semibold tabular-nums text-marino">
          {value === null ? "—" : max === 100 ? value : `${value} / ${max}`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bruma">
        <div className="h-full rounded-full bg-cielo" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
