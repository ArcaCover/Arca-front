"use client";

import type { ReactNode } from "react";
import type { CoverageDetail } from "./coverage-details";
import { useCoverageReveal } from "./useCoverageReveal";

// The two groups share this card and differ only in how it is painted: white
// on the lit canvas, or translucent on the marino panel.
const TONE = {
  light: {
    card: "bg-white card-on-canvas hover:shadow-[0_0_16px_-3px_color-mix(in_srgb,var(--color-marino)_16%,transparent),0_22px_46px_-16px_color-mix(in_srgb,var(--color-marino)_26%,transparent),0_54px_100px_-40px_color-mix(in_srgb,var(--color-marino)_42%,transparent)]",
    stage: "cv-stage-light",
    name: "text-marino",
    description: "text-marino/66",
    rule: "border-marino/10",
    hint: "text-marino/55",
    scenario: "text-marino/[0.82]",
  },
  dark: {
    card: "border border-cielo/[0.22] bg-white/[0.06] hover:-translate-y-[3px] hover:border-cielo/45 hover:bg-white/10",
    stage: "cv-stage-dark",
    name: "text-white",
    description: "text-white/66",
    rule: "border-white/[0.14]",
    hint: "text-white/55",
    scenario: "text-white/85",
  },
} as const;

export default function CoverageCard({
  coverage,
  tone,
  illustration,
}: {
  coverage: CoverageDetail;
  tone: keyof typeof TONE;
  illustration: ReactNode;
}) {
  const { open, toggle, onEnter, onLeave, hint } = useCoverageReveal();
  const styles = TONE[tone];
  const scenarioId = `scenario-${coverage.number}`;

  return (
    <article
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`rounded-[34px] p-5 pb-7 transition-[background-color,border-color,box-shadow,transform] duration-[400ms] ease-[cubic-bezier(.2,.8,.2,1)] ${styles.card}`}
    >
      <div
        aria-hidden
        className={`flex h-[214px] items-center justify-center overflow-hidden rounded-3xl px-5 py-[14px] ${styles.stage}`}
      >
        {illustration}
      </div>

      <div className="px-[18px] pt-[26px]">
        <div className="flex items-baseline gap-[14px]">
          <span className="font-heading text-sm font-semibold text-cielo">
            {coverage.number}
          </span>
          <h3
            className={`font-heading text-[25px] font-medium leading-[1.16] tracking-[-0.02em] ${styles.name}`}
          >
            {coverage.name}
          </h3>
        </div>

        <p className={`mt-[14px] text-pretty text-[15.5px] leading-[1.68] ${styles.description}`}>
          {coverage.description}
        </p>

        {/* A real button, so the scenario is reachable by keyboard and its
            state is announced. Hover just mirrors what this already does. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={scenarioId}
          className={`mt-6 flex w-full cursor-pointer items-center justify-between gap-4 border-t pt-5 text-left ${styles.rule}`}
        >
          <span className="rounded-full bg-oro px-[15px] py-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-marino">
            Imagine this
          </span>
          <span className={`text-[13.5px] font-semibold ${styles.hint}`}>{hint}</span>
        </button>

        <div id={scenarioId} className="cv-reveal" data-open={open}>
          <div className="overflow-hidden">
            <p
              className={`mt-[18px] text-pretty text-base italic leading-[1.7] ${styles.scenario}`}
            >
              {coverage.scenario}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
