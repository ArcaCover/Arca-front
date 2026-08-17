"use client";

import { useEffect, useRef, useState } from "react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";

// The Layer 1 sources from CLAUDE.md §6.3, in the order the scan works through
// them. Fixed sequence, never shuffled.
const MESSAGES = [
  "Scanning your firm's website...",
  "Checking for AI usage policies...",
  "Analyzing your tech stack...",
  "Reviewing bar standing records...",
  "Detecting AI-related job postings...",
  "Evaluating data protection signals...",
  "Calculating your AI Governance Score...",
];

const ROTATION_MS = 3500;

// The bar stops short of the end on purpose: when the real scan answers, the
// jump to 100% should feel like an arrival rather than a correction.
const PROGRESS_TARGET = 90;

export default function ScanningPage() {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kick the bar off its zero so the CSS transition has somewhere to go.
    const start = requestAnimationFrame(() => setProgress(PROGRESS_TARGET));

    // The messages keep advancing under reduced motion — the scan is still
    // reporting what it is doing. Only the travel between them is dropped,
    // which the transition classes handle on their own.
    const rotation = setInterval(() => {
      setIndex((current) => {
        setPrevious(current);
        return (current + 1) % MESSAGES.length;
      });
    }, ROTATION_MS);

    // Animated here rather than with a keyframe: the pulse belongs to this
    // screen alone. globals.css already neutralises .orb-sphere transforms
    // under reduced motion, but starting a pointless animation is worse than
    // not starting one.
    const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pulse = stillness.matches
      ? undefined
      : orbRef.current?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }],
          { duration: 2000, iterations: Infinity, easing: "ease-in-out" },
        );

    return () => {
      cancelAnimationFrame(start);
      clearInterval(rotation);
      pulse?.cancel();
    };
  }, []);

  // TODO: on scan complete, redirect to /score with results

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[480px] flex-col items-center">
        <ArcaWordmark className="h-7 w-auto text-marino" />

        <div
          ref={orbRef}
          aria-hidden
          className="orb-sphere mt-16 h-[120px] w-[120px] rounded-full [will-change:transform]"
        />

        {/* One line tall with the overflow clipped, so the messages read as a
            reel: the outgoing line leaves through the top while the next one
            climbs in from below. */}
        <div
          aria-live="polite"
          className="mt-16 grid h-7 overflow-hidden text-center font-heading text-lg text-marino"
        >
          {MESSAGES.map((message, position) => (
            <span
              key={message}
              aria-hidden={position !== index}
              className={`col-start-1 row-start-1 transition-all duration-[400ms] ease-out motion-reduce:transition-none ${
                position === index
                  ? "translate-y-0 opacity-100"
                  : position === previous
                    ? "-translate-y-full opacity-0"
                    : "translate-y-full opacity-0"
              }`}
            >
              {message}
            </span>
          ))}
        </div>

        <p className="mt-3 text-sm text-marino/45">
          This usually takes less than 60 seconds.
        </p>

        <div className="mt-10 h-1 w-[280px] overflow-hidden rounded-full bg-bruma">
          <div
            className="h-full rounded-full bg-cielo transition-[width] duration-[25000ms] ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </main>
  );
}
