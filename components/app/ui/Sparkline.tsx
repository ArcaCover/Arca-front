/**
 * A line chart drawn with SVG, no chart library (spec 2026-10-29 §3). The figure carries its own label and a
 * visually hidden table, so the numbers are readable without seeing the line.
 */
export function Sparkline({
  points, label, min = 0, max = 100, height = 140,
}: { points: { label: string; value: number }[]; label: string; min?: number; max?: number; height?: number }) {
  const width = 560;
  const padX = 28;
  const padY = 18;
  const x = (index: number) => padX + (index * (width - padX * 2)) / Math.max(1, points.length - 1);
  const y = (value: number) => padY + (1 - (value - min) / (max - min)) * (height - padY * 2);
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${height - padY} L${x(0).toFixed(1)} ${height - padY} Z`;
  const last = points[points.length - 1];

  return (
    <figure>
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75].map(fraction => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + fraction * (height - padY * 2)}
            y2={padY + fraction * (height - padY * 2)}
            className="stroke-marino/10"
            strokeDasharray="3 5"
          />
        ))}
        <path d={area} className="fill-cielo/15" />
        <path d={line} className="fill-none stroke-cielo" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle cx={x(index)} cy={y(point.value)} r={point === last ? 6 : 4} className={point === last ? "fill-oro stroke-marino" : "fill-white stroke-cielo"} strokeWidth={2} />
            <text x={x(index)} y={height - 2} textAnchor="middle" className="fill-marino/55 text-[11px]">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {points.map(point => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** A horizontal progress bar with a visible label. */
export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div>
      <div className="flex justify-between text-xs text-marino/70">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-1.5 h-2 rounded-full bg-marino/10">
        <div className="h-2 rounded-full bg-oro transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
