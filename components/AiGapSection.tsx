"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";
import AiGapCards from "./AiGapCards";

const COUNT_MS = 1400;

const FIGURE =
  "flex flex-col items-center gap-[18px] px-10 text-center max-[1080px]:px-0";
// The dollar range is the widest figure, so it gets a third step down on
// phones or it runs past the edge of the screen.
const FIGURE_NUM =
  "flex items-baseline font-heading text-[92px] font-semibold leading-none tracking-[-0.05em] text-marino max-[1080px]:text-[68px] max-[640px]:text-[44px]";
const FIGURE_COPY = "max-w-[262px] text-[17px] leading-[1.55] text-marino/80";

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
  const [closingRef, closingInView] = useInView<HTMLDivElement>({
    threshold: 0.4,
  });

  return (
    <section
      ref={sectionRef}
      className={`ai-gap bg-white ${sectionOnScreen ? "" : "ai-gap--paused"}`}
    >
      {/* ═══ BLOCK A — stats ═══ */}
      {/* TODO: verify data + add sources before launch */}
      <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-[76px] px-20 pb-[116px] pt-[132px] max-[1080px]:gap-14 max-[1080px]:px-10 max-[1080px]:pb-[84px] max-[1080px]:pt-24">
        <div className="flex max-w-[860px] flex-col items-center gap-[26px] text-center">
          <h2 className="font-heading text-[70px] font-medium leading-[1.02] tracking-[-0.042em] text-marino max-[1080px]:text-[48px]">
            Your policy was written before AI.
          </h2>
          <p className="max-w-[660px] text-pretty text-[21px] leading-[1.58] text-marino/80">
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
              <span className="text-cielo">&nbsp;of&nbsp;</span>13
            </span>
            <p className={FIGURE_COPY}>
              major malpractice insurers report rising AI claims
            </p>
          </div>
        </div>

        {/* TODO: verify data + add sources before launch */}
        <p className="max-w-[820px] text-center text-[13px] leading-[1.8] text-marino/45">
          Source note — placeholder. [1] survey, year, sample. &nbsp;[2] range,
          methodology. &nbsp;[3] study, year.
          <br />
          Figures shown are provisional and pending verification.
        </p>
      </div>

      {/* ═══ BLOCK B — three cards ═══ */}
      <div className="mx-auto max-w-[1380px] px-6 pb-6 max-[1080px]:px-3 max-[1080px]:pb-3">
        <div className="ag-panel-inner rounded-[44px] px-12 pb-[104px] pt-24 max-[1080px]:rounded-[32px] max-[1080px]:px-5 max-[1080px]:pb-16 max-[1080px]:pt-14">
          <AiGapCards />

          {/* ═══ BLOCK C — closing ═══ */}
          <div
            ref={closingRef}
            className="flex flex-col items-center gap-2.5 px-5 pb-8 pt-[136px] text-center max-[1080px]:px-3 max-[1080px]:pb-4 max-[1080px]:pt-20"
          >
            <span
              className="ag-closing-line font-heading text-[48px] font-normal leading-[1.22] tracking-[-0.04em] text-white/40 max-[1080px]:text-[30px]"
              style={{ opacity: closingInView ? 1 : 0 }}
            >
              Others insure the companies that build and sell AI.
            </span>
            <span
              className="ag-closing-line font-heading text-[48px] font-medium leading-[1.22] tracking-[-0.04em] text-white max-[1080px]:text-[30px]"
              style={{
                opacity: closingInView ? 1 : 0,
                transitionDelay: "600ms",
              }}
            >
              <em className="not-italic text-oro">ARCA</em> insures the
              professional who uses it.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
