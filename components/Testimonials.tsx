"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/useInView";
import { TESTIMONIALS, type AccentToken } from "@/lib/mock/testimonials";

// Named tokens map to classes here so the data file never holds a raw hex.
const ACCENT_CLASS: Record<AccentToken, string> = {
  marino: "bg-marino text-white",
  cielo: "bg-cielo text-marino",
  "oro-oscuro": "bg-oro-oscuro text-marino",
};

const FADE_MS = 300;

function initialsOf(firmName: string): string {
  return firmName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export default function Testimonials() {
  const [sectionRef, inView] = useInView<HTMLElement>({
    threshold: 0.15,
    once: false,
  });
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Fade the content out, swap it while it is invisible, then fade back in.
  function go(direction: 1 | -1) {
    if (timerRef.current) {
      return;
    }
    setFading(true);
    timerRef.current = setTimeout(() => {
      setIndex((current) => {
        return (current + direction + TESTIMONIALS.length) % TESTIMONIALS.length;
      });
      setFading(false);
      timerRef.current = null;
    }, FADE_MS);
  }

  const testimonial = TESTIMONIALS[index];

  return (
    <section ref={sectionRef} className="bg-bruma px-6 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-medium tracking-tight text-marino md:text-5xl">
          What our clients say.
        </h2>

        <div className="relative mx-auto mt-12 min-h-[420px] max-w-4xl overflow-hidden rounded-3xl">
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            <div
              className={`testimonial-bg absolute inset-x-0 top-0 h-[400%] ${
                inView ? "" : "testimonial-bg--paused"
              }`}
            />
          </div>
          <div aria-hidden="true" className="testimonial-scrim absolute inset-0" />

          <figure
            className={`testimonial-fade relative flex min-h-[420px] flex-col gap-10 p-8 pb-24 transition-opacity duration-300 md:flex-row md:items-center md:gap-12 md:p-12 ${
              fading ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex-1 md:basis-3/5">
              <p className="font-semibold text-white">{testimonial.firmName}</p>
              <p className="mt-3 font-heading text-2xl font-bold leading-snug tracking-tight text-white">
                {testimonial.headline}
              </p>
              <blockquote className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-2 text-sm text-white/60">
                {testimonial.author}
              </figcaption>

              {/* TODO: link to case study page */}
              <button
                type="button"
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Read case study
                <span aria-hidden="true">&rarr;</span>
              </button>

              <div className="mt-10 flex gap-8 md:gap-10">
                {testimonial.metrics.map((metric) => (
                  <div key={metric.label}>
                    <p className="whitespace-nowrap font-heading text-3xl font-bold tracking-tight text-oro md:text-4xl">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-white/60">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TODO: replace with real firm photo before launch */}
            <div className="md:basis-2/5">
              <div
                aria-hidden="true"
                className={`flex h-40 w-40 items-center justify-center rounded-2xl font-heading text-5xl font-bold ring-1 ring-white/20 md:h-[200px] md:w-[200px] ${
                  ACCENT_CLASS[testimonial.accentToken]
                }`}
              >
                {initialsOf(testimonial.firmName)}
              </div>
            </div>
          </figure>

          <div className="absolute bottom-6 right-6 flex gap-3 md:bottom-8 md:right-8">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => go(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3">
                <path
                  d="M8 2L4 6l4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={() => go(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3">
                <path
                  d="M4 2l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
