"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/useInView";
import type { CoverageGroupContent } from "./coverage-details";
import CoverageCard from "./CoverageCard";

const TONE = {
  light: {
    pill: "bg-bruma text-marino",
    header: "text-marino",
    description: "text-marino/72",
  },
  dark: {
    pill: "bg-white/10 text-oro",
    header: "text-white",
    description: "text-white/72",
  },
} as const;

/**
 * One band of four coverages. Third-party and first-party share it: the tone
 * decides whether the band runs straight on the page canvas or inside the
 * rounded marino panel.
 *
 * It is a client component only to hold the IntersectionObserver. Eight
 * illustrations carry around thirty looping animations between them, and §11
 * of the project notes says a loop must stop once its section leaves the
 * screen — `data-still` on the wrapper is what parks them.
 */
export default function CoverageGroup({
  group,
  tone,
  illustrations,
}: {
  group: CoverageGroupContent;
  tone: keyof typeof TONE;
  illustrations: ReactNode[];
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.05, once: false });
  const styles = TONE[tone];

  const content = (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <span
            className={`inline-block rounded-full px-[14px] py-[7px] text-[11px] font-bold uppercase tracking-[0.16em] ${styles.pill}`}
          >
            {group.label}
          </span>
          <h2
            className={`mt-[22px] text-pretty font-heading text-[clamp(31px,4vw,46px)] font-medium leading-[1.06] tracking-[-0.03em] ${styles.header}`}
          >
            {group.header}
          </h2>
        </div>
        <p
          className={`text-pretty text-[17.5px] leading-[1.68] lg:pt-2 ${styles.description}`}
        >
          {group.description}
        </p>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        {group.coverages.map((coverage, index) => (
          <CoverageCard
            key={coverage.name}
            coverage={coverage}
            tone={tone}
            illustration={illustrations[index]}
          />
        ))}
      </div>
    </>
  );

  if (tone === "light") {
    return (
      <section
        id={group.id}
        ref={ref}
        data-still={!inView}
        className="mx-auto max-w-[1440px] scroll-mt-24 px-6 pb-10 pt-20 sm:px-[60px]"
      >
        {content}
      </section>
    );
  }

  return (
    <section
      id={group.id}
      ref={ref}
      data-still={!inView}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-0 pt-[52px] sm:px-[60px]"
    >
      {/* The panel keeps its corners on desktop and goes edge to edge on
          mobile, where a 44px radius eats into the little width there is. */}
      <div className="relative overflow-hidden bg-marino px-6 py-14 shadow-[0_40px_90px_-40px_color-mix(in_srgb,var(--color-marino)_55%,transparent)] sm:rounded-[44px] sm:px-16 sm:pb-[68px] sm:pt-[76px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_92%_0%,color-mix(in_srgb,var(--color-cielo)_22%,transparent)_0%,transparent_70%),radial-gradient(50%_40%_at_0%_100%,color-mix(in_srgb,var(--color-cielo)_14%,transparent)_0%,transparent_70%)]"
        />
        <div className="relative">{content}</div>
      </div>
    </section>
  );
}
