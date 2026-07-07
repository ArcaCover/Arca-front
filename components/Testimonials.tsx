"use client";

import { useEffect, useRef, useState } from "react";

// TODO: replace placeholder testimonials with real ones before launch
const TESTIMONIALS = [
  {
    quote: "Arca made covering our AI tools genuinely simple.",
    name: "Jordan Ellis",
    role: "CEO",
    company: "Northwind Legal",
  },
  {
    quote: "Finally, liability cover that understands automated decisions.",
    name: "Priya Shah",
    role: "Chief Legal Officer",
    company: "Meridian Accounting",
  },
  {
    quote: "Fast, digital, and built for how we actually work.",
    name: "Daniel Rees",
    role: "Head of Insurance",
    company: "Vantage Advisors",
  },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const step = track.scrollWidth / TESTIMONIALS.length;
    const maxScroll = track.scrollWidth - track.clientWidth;
    // Wrap back to the start when advancing past the last card.
    if (direction === 1 && track.scrollLeft >= maxScroll - 1) {
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const index = Math.round(track.scrollLeft / step);
    const next = Math.max(0, index + direction);
    track.scrollTo({ left: Math.min(next * step, maxScroll), behavior: "smooth" });
  }

  // Auto-advance every 5s; paused on hover/focus and when reduced motion is set.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => scrollByCard(1), 5000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-bold text-marino md:text-4xl">
          What our clients say.
        </h2>
        <div
          className="mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none]"
          >
            {TESTIMONIALS.map((testimonial) => (
              <figure
                key={testimonial.name}
                className="min-w-[85%] snap-start rounded-2xl bg-bruma p-8 sm:min-w-[60%] lg:min-w-[45%]"
              >
                <blockquote className="text-lg leading-relaxed text-marino">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-marino font-heading text-sm font-bold text-white"
                  >
                    {initialsOf(testimonial.name)}
                  </span>
                  <span>
                    <span className="block font-bold text-marino">
                      {testimonial.name}
                    </span>
                    <span className="block text-sm text-marino/70">
                      {testimonial.role}, {testimonial.company}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={() => scrollByCard(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-marino/20 text-marino transition-colors hover:bg-bruma"
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
              onClick={() => scrollByCard(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-marino/20 text-marino transition-colors hover:bg-bruma"
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
