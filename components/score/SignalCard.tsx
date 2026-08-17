import { CheckCircle2, XCircle } from "lucide-react";

import type { Signal } from "@/lib/mock/score-data";

export default function SignalCard({ signal }: { signal: Signal }) {
  const Icon = signal.positive ? CheckCircle2 : XCircle;
  const accent = signal.positive ? "text-cielo" : "text-rojo";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${
        signal.positive ? "border-bruma" : "border-rojo/25"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${accent}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-marino">{signal.label}</p>
        <p className="mt-0.5 text-xs text-marino/50">{signal.source}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${accent}`}>
        {signal.positive ? "Positive" : "Negative"}
      </span>
    </div>
  );
}
