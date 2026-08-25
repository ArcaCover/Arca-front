"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Info, Star } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { DomainBar, ScoreGauge, TierBadge } from "@/components/score";
import { MOCK_ASSESSMENT_RESULTS } from "@/lib/mock/assessment-results";
import { tierForScore } from "@/lib/score-tiers";
import type { DomainStatus } from "@/lib/types/assessment-results";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Warning wears oro-oscuro, not rojo: rojo is reserved for errors and alerts
// (CLAUDE.md §5), and a domain that could be stronger is neither.
const STATUS = {
  good: { Icon: CheckCircle2, color: "text-cielo", label: "On track" },
  warning: { Icon: AlertTriangle, color: "text-oro-oscuro", label: "Needs attention" },
} satisfies Record<DomainStatus, { Icon: typeof CheckCircle2; color: string; label: string }>;

function ResultsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");
  const domain = params.get("domain");

  // TODO: replace with API call to GET /assessment/{assessment_id}/results
  const {
    firm,
    composite_score,
    benchmark_percentile,
    benchmark_segment,
    domain_scores,
    action_plan,
    pricing,
  } = MOCK_ASSESSMENT_RESULTS;

  const incomplete = !email || !domain;
  useEffect(() => {
    if (incomplete) router.replace("/quote");
  }, [incomplete, router]);

  if (incomplete) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[960px] px-6 py-10 sm:px-8 lg:py-14">
        <header>
          <ArcaWordmark className="h-7 w-auto text-marino" />
        </header>

        <p className="mt-8 flex items-start justify-center gap-2 text-sm text-marino/50 md:justify-start">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          This is an illustrative assessment. Actual scores and pricing require a real scan
          and verified data.
        </p>

        {/* 1 — Score overview */}
        <section className="mt-8 flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="text-center md:text-left">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-marino sm:text-4xl">
              {firm.name}
            </h1>
            <p className="mt-3 text-[15px] text-marino/55">
              {firm.city}, {firm.state} · {firm.attorneys_count} attorneys
            </p>
            <p className="mt-5 max-w-[340px] text-[15px] leading-relaxed text-marino">
              Better than{" "}
              <span className="font-semibold">{benchmark_percentile}%</span> of{" "}
              {benchmark_segment}.
            </p>
          </div>

          <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center">
            <ScoreGauge score={composite_score} />
            <div className="mt-5">
              {/* Derived from the score rather than read from the payload, so
                  the badge can never disagree with the gauge beside it. */}
              <TierBadge tier={tierForScore(composite_score)} />
            </div>
          </div>
        </section>

        {/* 2 — Score by domain */}
        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Score by domain
          </h2>
          <div className="mt-6 space-y-5">
            {Object.entries(domain_scores).map(([key, result]) => {
              const { Icon, color, label } = STATUS[result.status];

              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon aria-label={label} className={`h-5 w-5 shrink-0 ${color}`} />
                  <div className="flex-1">
                    <DomainBar
                      name={result.label}
                      score={result.score}
                      weight={result.weight}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3 — Action plan */}
        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Your action plan
          </h2>
          <p className="mt-2 text-[15px] text-marino/55">
            Each step assumes the ones above it are done first.
          </p>
          <div className="mt-6 space-y-4">
            {action_plan.map((item) => (
              <div
                key={item.priority}
                className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${
                  item.priority === 1 ? "border-oro" : "border-cielo"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bruma font-heading text-sm font-semibold text-marino">
                    {item.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-marino">{item.action}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="font-semibold text-marino">
                        +{item.score_impact} pts
                        <span className="ml-1.5 font-normal text-marino/55">
                          → score {item.projected_score}
                        </span>
                      </span>
                      <span className="font-semibold text-oro-oscuro">
                        Premium {item.premium_impact_percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 — Pricing */}
        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Your coverage options
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {pricing.options.map((option) => (
              <div
                key={option.name}
                className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-sm ${
                  option.recommended ? "border-2 border-oro" : "border border-bruma"
                }`}
              >
                {option.recommended ? (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-oro px-3 py-1 font-heading text-xs font-semibold text-marino">
                    <Star aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                    Recommended
                  </span>
                ) : null}

                <h3 className="font-heading text-lg font-semibold tracking-tight text-marino">
                  {option.name}
                </h3>

                <p className="mt-4 font-heading text-3xl font-semibold text-marino">
                  {USD.format(option.monthly_premium)}
                  <span className="ml-1 text-sm font-normal text-marino/55">/mo</span>
                </p>
                <p className="mt-1 text-sm text-marino/55">
                  {USD.format(option.annual_premium)} billed annually
                </p>

                <dl className="mt-5 space-y-2 border-t border-bruma pt-5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-marino/55">Per claim</dt>
                    <dd className="font-semibold text-marino">
                      {USD.format(option.limit_per_claim)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-marino/55">Aggregate</dt>
                    <dd className="font-semibold text-marino">
                      {USD.format(option.limit_aggregate)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => {
                    // TODO: start Stripe checkout once payments are connected
                  }}
                  className={`mt-6 w-full cursor-pointer rounded-full py-3 font-heading text-[15px] font-medium tracking-tight transition-transform duration-200 hover:-translate-y-px ${
                    option.recommended
                      ? "cta-glow bg-oro text-marino"
                      : "border border-marino/15 text-marino hover:border-cielo"
                  }`}
                >
                  Get coverage
                </button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[15px] text-marino/60">
            Prefer to talk to someone?{" "}
            <button
              type="button"
              onClick={() => {
                // TODO: route to the broker referral flow
              }}
              className="cursor-pointer font-semibold text-oro-oscuro underline-offset-4 hover:underline"
            >
              Connect with a broker →
            </button>
          </p>
        </section>

        <section className="mt-16 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              // TODO: generate PDF once the report endpoint exists
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-bruma bg-white px-6 py-3 font-heading text-[15px] font-medium tracking-tight text-marino transition-colors hover:border-cielo"
          >
            <FileText aria-hidden className="h-4 w-4" />
            Download Full Assessment Report
          </button>
        </section>

        <footer className="mt-20 text-center text-xs text-marino/45">© 2026 Arca</footer>
      </div>
    </div>
  );
}

export default function AssessmentResultsPage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <ResultsScreen />
    </Suspense>
  );
}
