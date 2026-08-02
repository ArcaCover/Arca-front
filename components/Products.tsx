"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// TODO: confirm covered-risk wording with counsel before launch
const PRODUCTS = [
  {
    name: "SLA",
    description:
      "Protection for when an AI service or model you depend on fails or goes down.",
    covers: [
      "AI service outages",
      "Third-party AI failures",
      "AI hallucinations",
    ],
    dark: false,
  },
  {
    name: "Liability",
    description:
      "Protection for when an automated decision or AI output harms a client or third party.",
    covers: [
      "Faulty automated decisions",
      "Professional liability",
      "Data breaches",
      "Confidentiality breaches",
      "IP infringement",
      "Algorithmic bias",
      "Regulatory non-compliance",
    ],
    dark: true,
  },
];

function ArchPattern({ patternId, dark }: { patternId: string; dark: boolean }) {
  return (
    <svg
      width="260"
      height="200"
      aria-hidden="true"
      className={`pointer-events-none absolute -right-10 -top-8 text-cielo ${
        dark ? "opacity-30" : "opacity-35"
      }`}
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
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [revealed, setRevealed] = useState(() => PRODUCTS.map(() => false));

  useEffect(() => {
    const cards = cardRefs.current;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setRevealed(PRODUCTS.map(() => true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const index = cards.indexOf(entry.target as HTMLElement);
          setRevealed((current) =>
            current.map((seen, position) => (position === index ? true : seen)),
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18 },
    );

    cards.forEach((card) => {
      if (card) {
        observer.observe(card);
      }
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="products"
      aria-label="Our products"
      className="bg-white px-5 py-16 min-[861px]:px-10 min-[861px]:pb-28 min-[861px]:pt-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <h2 className="mb-14 text-pretty text-center font-heading text-[clamp(32px,4vw,52px)] font-medium tracking-[-0.035em] text-marino">
          We insure next-generation services.
        </h2>

        <div className="grid items-start gap-5 min-[861px]:grid-cols-2 min-[861px]:gap-8">
          {PRODUCTS.map((product, index) => (
            <article
              key={product.name}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              tabIndex={0}
              className={`product-card relative overflow-hidden rounded-[2rem] p-8 min-[861px]:p-10 ${
                product.dark
                  ? "product-card--dark bg-marino min-[861px]:mt-14"
                  : "product-card--light bg-bruma"
              } ${revealed[index] ? "is-in" : ""}`}
            >
              <ArchPattern
                patternId={`${baseId}-arch-${index}`}
                dark={product.dark}
              />

              <div className="relative flex flex-col gap-5">
                <span className="font-heading text-[13px] font-semibold tracking-[0.2em] text-cielo">
                  0{index + 1}
                </span>
                <h3
                  className={`font-heading text-[clamp(32px,3.4vw,40px)] font-medium tracking-[-0.035em] ${
                    product.dark ? "text-white" : "text-marino"
                  }`}
                >
                  {product.name}
                </h3>
                <p
                  className={`max-w-[400px] text-pretty text-[17px] leading-relaxed ${
                    product.dark ? "text-white/70" : "text-marino/80"
                  }`}
                >
                  {product.description}
                </p>

                {/* TODO: connect Get a quote flow (Lemonade-style) before launch */}
                <button
                  type="button"
                  className="mt-2 inline-flex cursor-pointer items-center gap-3.5 self-start rounded-full bg-oro py-2 pl-6 pr-2 font-heading text-base font-bold tracking-tight text-marino transition-colors duration-300 hover:bg-oro-oscuro"
                >
                  Get a quote
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-marino text-oro"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>

                {/* Sits last so it can collapse to nothing without moving the
                    button above it. The negative margin cancels the column gap
                    while closed; the spacing lives inside the folding area. */}
                <div className="product-fold -mt-5">
                  <div className="overflow-hidden">
                    <div className="flex flex-col gap-3.5 pt-6">
                      <span
                        className={`h-px w-full ${
                          product.dark ? "bg-cielo/30" : "bg-marino/15"
                        }`}
                      />
                      <span className="font-heading text-xs font-bold uppercase tracking-[0.16em] text-cielo">
                        What this covers
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {product.covers.map((cover, chipIndex) => (
                          <span
                            key={cover}
                            style={{
                              transitionDelay: `${(chipIndex + 1) * 50}ms`,
                            }}
                            className={`product-chip rounded-full border px-[18px] py-2 text-[15px] font-semibold ${
                              product.dark
                                ? "border-cielo/45 bg-cielo/15 text-white"
                                : "border-cielo/50 bg-white text-marino"
                            }`}
                          >
                            {cover}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
