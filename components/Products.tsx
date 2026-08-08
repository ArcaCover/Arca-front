"use client";

import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { COVERAGE_GROUPS } from "@/lib/coverages";
import { useInView } from "@/lib/useInView";

function ArchPattern({ patternId }: { patternId: string }) {
  return (
    <svg
      width="260"
      height="200"
      aria-hidden="true"
      className="pointer-events-none absolute -right-10 -top-8 text-cielo opacity-30"
    >
      <defs>
        <pattern
          id={patternId}
          width="90"
          height="90"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M6 90 L6 52 A39 39 0 0 1 84 52 L84 90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </pattern>
      </defs>
      <rect width="260" height="200" fill={`url(#${patternId})`} />
    </svg>
  );
}

export default function Products() {
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Reduced motion is handled in CSS: the card shows regardless of this flag.
  const [cardRef, cardOnScreen] = useInView<HTMLElement>({ threshold: 0.18 });

  return (
    <section
      id="products"
      aria-label="Our product"
      className="bg-white px-5 py-16 min-[861px]:px-10 min-[861px]:pb-28 min-[861px]:pt-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <h2 className="mb-14 text-pretty text-center font-heading text-[clamp(32px,4vw,52px)] font-medium tracking-[-0.035em] text-marino">
          One policy. Eight coverages.
        </h2>

        <article
          ref={cardRef}
          className={`product-card product-card--dark relative overflow-hidden rounded-[2rem] bg-marino p-6 min-[861px]:p-12 ${
            cardOnScreen ? "is-in" : ""
          }`}
        >
          <ArchPattern patternId={`${baseId}-arch`} />

          <div className="relative flex flex-col gap-10">
            <div className="flex max-w-[560px] flex-col gap-5">
              <h3 className="font-heading text-[clamp(30px,3.4vw,40px)] font-medium tracking-[-0.035em] text-white">
                AI Professional Malpractice
              </h3>
              <p className="text-pretty text-[17px] leading-relaxed text-white/70">
                Professional liability cover for firms whose work runs on AI —
                for the errors it makes on your behalf, and what it costs to put
                them right.
              </p>

              {/* TODO: connect Get a quote flow (Lemonade-style) before launch */}
              <button
                type="button"
                className="group mt-2 inline-flex cursor-pointer items-center gap-3.5 self-start rounded-full bg-oro py-2 pl-6 pr-2 font-heading text-base font-bold tracking-tight text-marino transition-colors duration-300 hover:bg-oro-oscuro"
              >
                Get a quote
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>

            <span aria-hidden="true" className="h-px w-full bg-cielo/30" />

            {/* The two groups sit side by side so the four-and-four split reads
                at a glance, and stack on narrow screens. */}
            <div className="grid gap-10 min-[768px]:grid-cols-2 min-[861px]:gap-12">
              {COVERAGE_GROUPS.map((group) => (
                <div key={group.id} className="flex flex-col gap-4">
                  <span className="font-heading text-xs font-bold uppercase tracking-[0.16em] text-cielo">
                    {group.label}
                  </span>
                  <p className="text-[15px] leading-relaxed text-white/60">
                    {group.blurb}
                  </p>
                  <ul className="flex flex-wrap gap-2.5">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        // Centred so the longest name still reads as a pill if
                        // it wraps on very narrow screens.
                        className="rounded-full border border-cielo/45 bg-cielo/15 px-4 py-2 text-center text-[14px] font-semibold text-white min-[861px]:px-[18px] min-[861px]:text-[15px]"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
