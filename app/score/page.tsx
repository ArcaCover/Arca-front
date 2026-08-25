"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { DomainBar, ScoreGauge, SignalCard, TierBadge } from "@/components/score";
import { MOCK_PRE_SCORE } from "@/lib/mock/score-data";

function ScoreScreen() {
  const router = useRouter();
  // Carried over from the scan so the assessment knows which firm it is for.
  const query = useSearchParams().toString();

  // TODO: read scan results from API instead of mock data
  const { firm, score, tier, confidence, domains, signals } = MOCK_PRE_SCORE;

  // Positive findings read first. Sorted rather than hand-ordered so the
  // grouping survives a change to the data.
  const orderedSignals = [
    ...signals.filter((s) => s.positive),
    ...signals.filter((s) => !s.positive),
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[960px] px-6 py-10 sm:px-8 lg:py-14">
        <header>
          <ArcaWordmark className="h-7 w-auto text-marino" />
        </header>

        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-marino/50 md:justify-start">
          <Info aria-hidden className="h-4 w-4 shrink-0" />
          This is an illustrative example — not a real assessment.
        </p>

        <section className="mt-8 flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="text-center md:text-left">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-marino sm:text-4xl">
              {firm.name}
            </h1>
            <p className="mt-3 text-[15px] text-marino/55">
              {firm.state} · {firm.practiceArea}
            </p>
            <p className="text-[15px] text-marino/55">{firm.size} lawyers</p>
          </div>

          <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center">
            <ScoreGauge score={score} />
            <div className="mt-5">
              <TierBadge tier={tier} />
            </div>
            <p className="mt-3 text-xs text-marino/50">Confidence: {confidence}</p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Score breakdown
          </h2>
          <div className="mt-6 space-y-5">
            {domains.map((domain) => (
              <DomainBar
                key={domain.id}
                name={domain.name}
                score={domain.score}
                weight={domain.weight}
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Signals detected
          </h2>
          <div className="mt-6 space-y-3">
            {orderedSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </section>

        <section className="mt-16 flex flex-col items-center">
          <button
            type="button"
            onClick={() => router.push(`/assessment?${query}`)}
            className="cta-glow group inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
          >
            Complete full assessment
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              // TODO: generate PDF
            }}
            className="mt-5 cursor-pointer text-sm text-marino/60 underline-offset-4 transition-colors hover:text-marino hover:underline"
          >
            Download Quick Scan Report
          </button>
        </section>

        <footer className="mt-20 text-center text-xs text-marino/45">© 2026 Arca</footer>
      </div>
    </div>
  );
}

export default function ScorePage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <ScoreScreen />
    </Suspense>
  );
}
