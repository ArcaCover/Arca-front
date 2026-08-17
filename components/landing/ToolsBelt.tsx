"use client";

import { useInView } from "@/lib/useInView";

const TOOLS = [
  "Harvey",
  "CoCounsel",
  "Lexis+ AI",
  "Microsoft Copilot",
  "ChatGPT",
  "Google Gemini",
];

// Fades the marquee in and out at both ends of its band. Applied inline
// because the CSS pipeline strips mask-image declarations from stylesheets.
const BAND_FADE =
  "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)";

// Six short names do not span a wide viewport, so the list repeats four times.
// The keyframe travels -50%, which is exactly two lists: what scrolls into
// view is identical to what left, so the loop has no seam.
const COPIES = [0, 1, 2, 3];

export default function ToolsBelt() {
  const [ref, inView] = useInView<HTMLDivElement>({
    threshold: 0,
    once: false,
  });

  return (
    <div ref={ref} className="relative mx-auto max-w-[1240px] px-8 py-12 lg:px-[76px]">
      <p className="mb-5 text-center font-heading text-[17px] font-semibold tracking-tight text-marino/40">
        Protecting firms that use
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
            // Only the first pass is read out; the repeats are there to keep
            // the band full and would just stutter for a screen reader.
            <div
              key={copy}
              aria-hidden={copy > 0 ? "true" : undefined}
              className="flex items-center gap-10 pr-10"
            >
              {TOOLS.map((tool) => (
                <span
                  key={tool}
                  className="whitespace-nowrap font-heading text-base font-medium tracking-tight text-marino opacity-60"
                >
                  {tool}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
