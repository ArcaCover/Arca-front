export default function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const safeTotal = Math.max(1, total);
  const value = Math.min(safeTotal, Math.max(0, current));
  const percent = (value / safeTotal) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-heading text-sm font-medium text-marino">
          Question {value} of {safeTotal}
        </p>
        <span className="text-sm tabular-nums text-marino/50">{Math.round(percent)}%</span>
      </div>
      {/* Width is animated from an inline style rather than a scale utility:
          Tailwind v4 writes scale-* to the CSS `scale` property, which
          multiplies with any transform already on the node. */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bruma">
        <div
          className="h-full rounded-full bg-oro transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
