export default function DomainBar({
  name,
  score,
  weight,
}: {
  name: string;
  score: number;
  weight: string;
}) {
  const value = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-marino">
          {name} <span className="text-xs text-marino/45">{weight}</span>
        </p>
        <span className="text-sm font-semibold tabular-nums text-marino">{value}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bruma">
        <div className="h-full rounded-full bg-cielo" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
