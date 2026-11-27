"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import type { UnderwritingResult } from "@arca/contracts";

// Bank 4.0's outcome (DN-14 in Arca-back): a quote, a booking link or a decline. Only a quote shows a number, and every
// figure comes from the API: the limit selector only switches between the premiums it already priced.
export const INDICATIVE_LINE = "Indicative estimate, not an offer of insurance.";

const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const limitLabel = (limit: number) =>
  limit >= 1_000_000 ? `$${limit / 1_000_000}M` : `$${limit / 1000}K`;

export default function UnderwritingOutcome({ outcome }: { outcome: UnderwritingResult["outcome"] }) {
  const quote = outcome.type === "quote" ? outcome.quote : null;
  const [limit, setLimit] = useState(quote?.defaultLimit ?? 0);

  if (quote) {
    const selected = quote.limits.find((option) => option.limit === limit) ?? quote.limits[0]!;
    return (
      <section className="mt-7 rounded-[28px] border border-marino/8 bg-white p-6 sm:p-8" aria-labelledby="quote-heading">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-marino/70">Your estimate</p>
        <h2 id="quote-heading" className="mt-2 font-heading text-2xl font-medium tracking-tight">
          {/* Never a promise of coverage (spec §5, CLAUDE.md §7): there is no carrier yet, only an estimate. */}
          {quote.conditions.length ? "Your indicative estimate, with a few steps." : "Your indicative estimate."}
        </h2>
        <fieldset className="mt-6">
          <legend className="text-xs text-marino/70">Limit per claim</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {quote.limits.map((option) => (
              <button
                key={option.limit}
                type="button"
                aria-pressed={option.limit === selected.limit}
                onClick={() => setLimit(option.limit)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino ${
                  option.limit === selected.limit
                    ? "border-marino bg-marino text-white"
                    : "border-marino/20 text-marino hover:border-marino/50"
                }`}
              >
                {limitLabel(option.limit)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="mt-6 font-heading text-4xl font-medium tabular-nums tracking-tight" aria-live="polite">
          {usd(selected.annualPremium)}
          <span className="ml-2 text-sm font-normal text-marino/70">per year</span>
        </p>
        <p className="mt-2 text-xs leading-6 text-marino/70">{INDICATIVE_LINE}</p>
        {quote.conditions.length > 0 && (
          <div className="mt-6 border-t border-marino/10 pt-5">
            <h3 className="font-heading text-[16px] font-medium">Within the first {quote.conditions[0]!.dueDays} days</h3>
            <ul className="mt-3 space-y-3">
              {quote.conditions.map((condition) => (
                <li key={condition.fromQuestion} className="flex items-start gap-3 text-sm leading-6">
                  <CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0 text-cielo" />
                  <span>
                    <span className="font-semibold">{condition.what}</span>
                    <span className="block text-xs text-marino/70">{condition.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  const next = outcome.type === "schedule" ? outcome.schedule : outcome.type === "declined" ? outcome.declined : null;
  if (!next) return null;
  return (
    <section className="mt-7 rounded-[28px] border border-marino/8 bg-white p-6 sm:p-8" aria-labelledby="next-heading">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-marino/70">Next step</p>
      <h2 id="next-heading" className="mt-2 font-heading text-2xl font-medium tracking-tight">
        {outcome.type === "schedule" ? "Let’s talk it through." : "Not yet, and here is the way forward."}
      </h2>
      <p className="mt-3 text-sm leading-7 text-marino/75">{next.message}</p>
      <a
        href={next.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-oro px-5 py-3 text-sm font-semibold text-marino focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino"
      >
        <CalendarClock aria-hidden className="h-4 w-4" />
        {outcome.type === "schedule" ? "Book a time" : "Talk to us"}
        <ExternalLink aria-hidden className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}
