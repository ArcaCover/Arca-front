"use client";

import { useInView } from "@/lib/useInView";

const RISKS = [
  "A hallucinated citation in your brief",
  "A client sues over biased AI advice",
  "Your AI tool exposes privileged data",
  "A regulator audits your AI workflow",
  "An AI-drafted contract with wrong terms",
  "Your AI vendor goes down during trial prep",
  "A bar complaint over undisclosed AI use",
  "A breach in AI-assisted due diligence",
];

// Fades the marquee in and out at both ends of its band. Applied inline
// because the CSS pipeline strips mask-image declarations from stylesheets.
const BAND_FADE =
  "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)";

// The keyframe travels -50%, so the list is rendered twice and the second
// pass lands exactly where the first one started.
const COPIES = [0, 1];

export default function RisksBelt() {
  const [ref, inView] = useInView<HTMLDivElement>({
    threshold: 0,
    once: false,
  });

  return (
    <div ref={ref} className="relative mx-auto max-w-[1240px] px-8 py-12 lg:px-[76px]">
      <p className="mb-5 text-center font-heading text-[17px] font-semibold tracking-tight text-marino/40">
        The risks your current policy ignores
      </p>
      <div
        style={{ WebkitMaskImage: BAND_FADE, maskImage: BAND_FADE }}
        className="overflow-hidden"
      >
        <div
          className="flex w-max animate-marquee"
          style={{ animationPlayState: inView ? "running" : "paused" }}
        >
          {COPIES.map((copy) => (
            // Only the first pass is read out; the repeat is there to close the
            // loop and would just stutter for a screen reader.
            <div
              key={copy}
              aria-hidden={copy > 0 ? "true" : undefined}
              className="flex items-center gap-10 pr-10"
            >
              {RISKS.map((risk) => (
                <span
                  key={risk}
                  className="whitespace-nowrap font-heading text-base font-medium tracking-tight text-marino"
                >
                  {risk}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
