"use client";

import { useEffect, useState } from "react";

import { tierForScore, tierStyle } from "@/lib/score-tiers";

// Half circle, centred at (120, 120) with a radius of 100. Drawn with
// pathLength=100 so the dash offset is just `100 - score`: no arc-length
// arithmetic to keep in sync if the radius ever changes.
const ARC = "M 20 120 A 100 100 0 0 1 220 120";

export default function ScoreGauge({ score }: { score: number }) {
  const value = Math.min(100, Math.max(0, Math.round(score)));

  // The arc starts empty and fills on mount. One state flip, not a per-frame
  // loop: the transition itself runs on the compositor.
  const [filled, setFilled] = useState(false);
  useEffect(() => setFilled(true), []);

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 240 140"
        className="w-full"
        role="img"
        aria-label={`AI Governance Score: ${value} out of 100`}
      >
        <path
          d={ARC}
          className="fill-none stroke-bruma"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path
          d={ARC}
          pathLength={100}
          className={`fill-none ${tierStyle(tierForScore(value)).stroke} transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none`}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={filled ? 100 - value : 100}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <span className="font-heading text-4xl leading-none font-semibold text-marino">
          {value}
        </span>
        <span className="mt-1.5 text-xs text-marino/60">AI Governance Score</span>
      </div>
    </div>
  );
}
