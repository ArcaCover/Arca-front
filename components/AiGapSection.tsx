"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";
import { useVideoLoop } from "@/lib/useVideoLoop";
import AiGapCards from "./AiGapCards";

const COUNT_MS = 1400;

// min-w-0 matters: grid columns default to an auto minimum, so a long figure
// would widen its own column and push into the neighbour instead of staying put.
const FIGURE =
  "flex min-w-0 flex-col items-center gap-4 px-6 text-center max-[1080px]:px-0";
// One fluid size for all three keeps the row even and the baselines shared.
// The ceiling is set so the widest figure ($500K–$2M) still clears its column.
const FIGURE_NUM =
  "flex max-w-full items-baseline justify-center whitespace-nowrap font-heading text-[clamp(32px,3.4vw,48px)] font-semibold leading-none tracking-[-0.04em] text-marino";
const FIGURE_COPY = "max-w-[250px] text-[16px] leading-[1.55] text-marino/80";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

function CostRange() {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const parts = [
    { text: "$500K", delay: 0, separator: false },
    { text: "–", delay: 320, separator: true },
    { text: "$2M", delay: 620, separator: false },
  ];

  return (
    <span ref={ref} className={FIGURE_NUM}>
      {parts.map((part) => (
        <span
          key={part.text}
          className={`ag-late ${part.separator ? "px-1.5 text-cielo" : ""}`}
          style={{ opacity: inView ? 1 : 0, transitionDelay: `${part.delay}ms` }}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
}

export default function AiGapSection() {
  // Kept live (once: false) so the looping card animations can be paused again
  // once the section scrolls away.
  const [sectionRef, sectionOnScreen] = useInView<HTMLElement>({
    threshold: 0.01,
    once: false,
  });
  // The panel is a wide, open stretch of water, so it needs a longer fade than
  // the pre-footer to hide the seam.
  const { frontRef, backRef, play, pause } = useVideoLoop({
    handoffSeconds: 2,
    crossfadeMs: 1400,
  });
  // Tracked apart from the section: the panel sits at the bottom of a tall
  // block, so this keeps it from decoding while only the stats are on screen.
  const [panelRef, panelOnScreen] = useInView<HTMLDivElement>({
    threshold: 0.01,
    once: false,
  });

  useEffect(() => {
    if (panelOnScreen) {
      play();
    } else {
      pause();
    }
  }, [panelOnScreen, play, pause]);

  return (
    <section
      ref={sectionRef}
      className={`ai-gap bg-white ${sectionOnScreen ? "" : "ai-gap--paused"}`}
    >
      {/* ═══ BLOCK A — stats ═══ */}
      {/* TODO: verify data + add sources before launch */}
      <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-14 px-20 pb-[72px] pt-[88px] max-[1080px]:gap-10 max-[1080px]:px-10 max-[1080px]:pb-14 max-[1080px]:pt-16">
        <div className="flex max-w-[760px] flex-col items-center gap-5 text-center">
          <h2 className="font-heading text-[52px] font-medium leading-[1.04] tracking-[-0.04em] text-marino max-[1080px]:text-[38px]">
            Your policy was written before AI.
          </h2>
          <p className="max-w-[600px] text-pretty text-[18px] leading-[1.6] text-marino/80">
            Most professional liability policies don&rsquo;t mention artificial
            intelligence. The ones that do, exclude it.
          </p>
        </div>

        <div className="grid w-full max-w-[1120px] grid-cols-3 max-[1080px]:grid-cols-1 max-[1080px]:gap-12">
          <div className={FIGURE}>
            <span className={FIGURE_NUM}>
              <CountUp to={69} suffix="%" />
            </span>
            <p className={FIGURE_COPY}>
              of legal professionals now use generative AI at work
            </p>
          </div>

          <div
            className={`${FIGURE} border-l border-marino/10 max-[1080px]:border-l-0 max-[1080px]:border-t max-[1080px]:pt-12`}
          >
            <CostRange />
            <p className={FIGURE_COPY}>
              cost of a single AI-related malpractice event
            </p>
          </div>

          <div
            className={`${FIGURE} border-l border-marino/10 max-[1080px]:border-l-0 max-[1080px]:border-t max-[1080px]:pt-12`}
          >
            <span className={FIGURE_NUM}>
              <CountUp to={7} />
              <span className="px-[0.2em] text-[0.62em] text-cielo">of</span>13
            </span>
            <p className={FIGURE_COPY}>
              major malpractice insurers report rising AI claims
            </p>
          </div>
        </div>

      </div>

      {/* ═══ BLOCK B — three cards ═══ */}
      <div className="mx-auto max-w-[1380px] px-6 pb-6 max-[1080px]:px-3 max-[1080px]:pb-3">
        <div
          ref={panelRef}
          className="ag-panel-inner relative overflow-hidden rounded-[36px] px-10 py-16 max-[1080px]:rounded-[28px] max-[1080px]:px-5 max-[1080px]:py-12"
        >
          {/* Isolated so the two players can swap z-index between them without
              ever rising above the scrim and the cards. */}
          <div className="absolute inset-0 isolate">
            <video
              ref={frontRef}
              src="/videos/ocean.mp4"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              style={{ opacity: 1, zIndex: 0 }}
              className="absolute inset-0 h-full w-full object-cover transition-opacity ease-linear"
            />
            <video
              ref={backRef}
              src="/videos/ocean.mp4"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              style={{ opacity: 0, zIndex: 1 }}
              className="absolute inset-0 h-full w-full object-cover transition-opacity ease-linear"
            />
          </div>
          <div className="ag-panel-scrim pointer-events-none absolute inset-0" />

          <div className="relative">
            <AiGapCards />
          </div>
        </div>
      </div>
    </section>
  );
}
