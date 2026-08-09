"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OceanPanel from "./OceanPanel";
import { useInView } from "@/lib/useInView";

const CYCLE_SECONDS = 5.5;

const FEATURES = [
  {
    num: "01",
    title: "Know your risk in minutes",
    desc: "The AI Governance Scorecard walks through how your firm actually uses AI — tools, oversight, client data.",
  },
  {
    num: "02",
    title: "See where you stand",
    desc: "A clear picture of how your AI use holds up — what's solid, what's exposed, and where to fix it first.",
  },
  {
    num: "03",
    title: "Get real numbers",
    desc: "Three coverage options, ready to compare — in minutes, not a call with an underwriter.",
  },
  {
    num: "04",
    title: "Bind in minutes",
    desc: "Sign electronically, choose how you pay, and the policy is issued.",
  },
];

export default function Products() {
  const [sectionRef, sectionOnScreen] = useInView<HTMLElement>({
    threshold: 0,
    once: false,
  });
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const elapsedRef = useRef(0);
  const startRef = useRef(0);

  // The bar is written straight to the DOM: putting per-frame progress in state
  // would re-render the whole section sixty times a second.
  const paint = useCallback((progress: number, index: number) => {
    barRefs.current.forEach((bar, position) => {
      if (bar) {
        bar.style.transform = `scaleX(${position === index ? progress : 0})`;
      }
    });
  }, []);

  const select = useCallback(
    (index: number) => {
      // Both counters move together, or the next frame recomputes the elapsed
      // time from the old start and undoes the reset.
      elapsedRef.current = 0;
      startRef.current = performance.now();
      activeRef.current = index;
      paint(0, index);
      setActive(index);
    },
    [paint],
  );

  useEffect(() => {
    if (!sectionOnScreen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const duration = CYCLE_SECONDS * 1000;
    // Resumes mid-cycle when the section scrolls back into view.
    startRef.current = performance.now() - elapsedRef.current;
    let frame = requestAnimationFrame(function tick(now) {
      frame = requestAnimationFrame(tick);
      elapsedRef.current = now - startRef.current;
      let progress = elapsedRef.current / duration;
      if (progress >= 1) {
        progress = 0;
        elapsedRef.current = 0;
        startRef.current = now;
        const next = (activeRef.current + 1) % FEATURES.length;
        activeRef.current = next;
        setActive(next);
      }
      paint(progress, activeRef.current);
    });

    return () => cancelAnimationFrame(frame);
  }, [sectionOnScreen, paint]);

  return (
    <section
      id="products"
      ref={sectionRef}
      aria-label="How Arca works"
      className="bg-bruma px-5 py-16 min-[861px]:px-10 min-[861px]:pb-[88px] min-[861px]:pt-[72px]"
    >
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-8 rounded-[40px] bg-white p-6 shadow-[0_26px_60px_-34px_color-mix(in_srgb,var(--color-marino)_35%,transparent)] min-[861px]:flex-row min-[861px]:gap-10 min-[861px]:p-10">
        {/* Panel first on narrow screens, beside the list from 861px up. */}
        <div className="order-1 w-full min-[861px]:order-2 min-[861px]:w-[560px] min-[861px]:flex-none">
          <OceanPanel active={active} paused={!sectionOnScreen} />
        </div>

        <div className="order-2 flex w-full flex-col justify-center border-t border-marino/10 min-[861px]:order-1 min-[861px]:min-h-[420px] min-[861px]:flex-1">
          {FEATURES.map((feature, index) => (
            <button
              key={feature.num}
              type="button"
              onClick={() => select(index)}
              aria-current={index === active}
              className="cursor-pointer border-b border-marino/10 pt-[18px] text-left"
            >
              <span className="flex items-baseline gap-3">
                <span
                  className={`font-heading text-xs font-bold tracking-[0.1em] text-cielo transition-opacity duration-300 ${
                    index === active ? "opacity-100" : "opacity-40"
                  }`}
                >
                  {feature.num}
                </span>
                <span
                  className={`font-heading text-[16.5px] leading-[1.3] text-marino transition-opacity duration-300 min-[861px]:text-[18.5px] ${
                    index === active
                      ? "font-bold opacity-100"
                      : "font-medium opacity-55"
                  }`}
                >
                  {feature.title}
                </span>
              </span>
              <span
                className={`grid transition-[grid-template-rows] duration-[380ms] ease-out ${
                  index === active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <span className="overflow-hidden">
                  <span className="mt-2.5 block max-w-[44ch] text-pretty text-[13.5px] leading-[1.55] text-marino/70 min-[861px]:ml-8 min-[861px]:text-[15px]">
                    {feature.desc}
                  </span>
                </span>
              </span>
              <span
                className={`mt-[18px] block h-0.5 overflow-hidden rounded-full bg-marino/10 transition-opacity duration-300 ${
                  index === active ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* The initial scale is set inline, not with a utility class:
                    Tailwind's scale-* writes the `scale` property, which would
                    multiply with the transform the animation frame writes. */}
                <span
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  style={{ transform: "scaleX(0)" }}
                  className="block h-full w-full origin-left rounded-full bg-oro"
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
