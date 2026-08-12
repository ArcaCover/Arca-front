"use client";

import { useEffect, useRef, useState } from "react";

import { useVideoLoop } from "@/lib/useVideoLoop";

// The panel is designed at a fixed size and scaled to fit its column, which
// keeps every scene laid out exactly as approved at any viewport width.
const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 420;

const QUESTIONS = [
  "Which AI tools does your firm use for client work?",
  "Who reviews AI-assisted work before it leaves the firm?",
  "Does client data ever go into a consumer AI tool?",
  "Do you have a written AI policy your team follows?",
  "Has your team been trained on where AI gets things wrong?",
];

// Scene 01 runs on a fixed schedule: the two fields fill in, the scan sweeps
// through its sources, and the pre-score lands. Each number is the gap in ms
// from the previous step.
const SCAN_STEPS = [360, 680, 600, 520, 520, 500];
const SCAN_FIELDS = [
  { label: "Firm website", value: "yourfirm.com", filledAt: 1 },
  { label: "Work email", value: "you@yourfirm.com", filledAt: 2 },
];
const SCAN_SOURCES = [
  "Reading your website",
  "Checking your tech stack",
  "Checking public records",
];

// TODO: replace placeholder premiums with real rates before launch
const QUOTES = [
  { name: "GOOD", value: 3150, limit: "$500K", rotation: -7, lift: 10, width: 148, size: 25, featured: false },
  { name: "BETTER", value: 4420, limit: "$1M", rotation: 0, lift: -8, width: 172, size: 30, featured: true },
  { name: "BEST", value: 6900, limit: "$2M", rotation: 7, lift: 10, width: 148, size: 25, featured: false },
];

const BIND_STEPS = [
  { name: "Signed", meta: "Warranty statement · e-signature" },
  { name: "Payment confirmed", meta: "Secure payment processed" },
  { name: "Policy issued", meta: "Documents in your inbox" },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One of the moments a scene walks through, cross-faded in place. */
function Beat({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-[340ms] ease-out ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

/** Wraps a scene so only the active one is visible and interactive. */
function Scene({
  isActive,
  className,
  children,
}: {
  isActive: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ transform: `translateY(${isActive ? 0 : 14}px)` }}
      className={`absolute inset-y-[34px] inset-x-9 transition-[opacity,transform] duration-[340ms] ease-out ${
        isActive ? "opacity-100" : "pointer-events-none opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function OceanPanel({
  active,
  paused,
}: {
  active: number;
  paused: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { frontRef, backRef, play, pause } = useVideoLoop();
  const [scale, setScale] = useState(1);
  const [scanStep, setScanStep] = useState(0);
  const [question, setQuestion] = useState(0);
  const [questionIn, setQuestionIn] = useState(true);
  const [quoted, setQuoted] = useState(false);
  const [countProgress, setCountProgress] = useState(0);
  const [boundStep, setBoundStep] = useState(0);

  // Scale the fixed-size panel down to whatever width the column gives it.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PANEL_WIDTH));
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion()) {
      pause();
      return;
    }
    play();
  }, [paused, play, pause]);

  // Each scene runs its own little sequence, restarted whenever it becomes the
  // active one and stopped while the section is off screen.
  useEffect(() => {
    if (paused) {
      return;
    }

    if (active === 0) {
      setScanStep(0);
      const timers: ReturnType<typeof setTimeout>[] = [];
      let at = 0;
      SCAN_STEPS.forEach((gap, index) => {
        at += gap;
        timers.push(setTimeout(() => setScanStep(index + 1), at));
      });
      return () => timers.forEach(clearTimeout);
    }

    if (active === 1) {
      setQuestion(0);
      setQuestionIn(true);
      let fade: ReturnType<typeof setTimeout>;
      const rotate = setInterval(() => {
        setQuestionIn(false);
        fade = setTimeout(() => {
          setQuestion((current) => (current + 1) % QUESTIONS.length);
          setQuestionIn(true);
        }, 340);
      }, 1350);
      return () => {
        clearInterval(rotate);
        clearTimeout(fade);
      };
    }

    // Two beats: the standing the answers produce, then the prices it earns.
    if (active === 2) {
      setQuoted(false);
      setCountProgress(0);
      let count: ReturnType<typeof setInterval>;
      // The figures only start counting once the cards are the ones on screen.
      const enter = setTimeout(() => {
        setQuoted(true);
        const start = performance.now();
        count = setInterval(() => {
          const linear = Math.min(1, (performance.now() - start) / 1100);
          setCountProgress(1 - Math.pow(1 - linear, 3));
          if (linear >= 1) {
            clearInterval(count);
          }
        }, 40);
      }, 1800);
      return () => {
        clearTimeout(enter);
        clearInterval(count);
      };
    }

    if (active === 3) {
      setBoundStep(0);
      const timers: ReturnType<typeof setTimeout>[] = [];
      const advance = (step: number) => {
        setBoundStep(step);
        if (step < 4) {
          timers.push(setTimeout(() => advance(step + 1), 520));
        }
      };
      timers.push(setTimeout(() => advance(1), 380));
      return () => timers.forEach(clearTimeout);
    }
  }, [active, paused]);

  // The last step of the sweep is the result, so the bar fills over the three
  // steps before it.
  const scanned = scanStep >= SCAN_STEPS.length;
  const scanProgress = Math.max(0, Math.min(1, (scanStep - 2) / 3)) * 100;
  const scanSource = Math.max(0, Math.min(SCAN_SOURCES.length - 1, scanStep - 3));
  const count = active === 2 ? countProgress : 0;
  const bound = active === 3 ? boundStep : 0;
  // Four nodes, so the line covers a third of the track per step after the first.
  const timelineFill = Math.max(0, Math.min(1, (bound - 1) / 3));
  const money = (value: number) =>
    `$${(Math.round((value * count) / 10) * 10).toLocaleString("en-US")}`;

  return (
    // Decorative: the feature list beside it carries the actual message.
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="w-full overflow-hidden rounded-[28px]"
      style={{ height: PANEL_HEIGHT * scale }}
    >
      <div
        className="relative overflow-hidden rounded-[28px] bg-marino"
        style={{
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Isolated so the two players can swap z-index between them without
            ever rising above the overlay and the scenes. */}
        <div className="absolute inset-0 isolate">
          <video
            ref={frontRef}
            src="/videos/ocean.mp4"
            muted
            loop
            playsInline
            preload="metadata"
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
            style={{ opacity: 0, zIndex: 1 }}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-linear"
          />
        </div>
        <div className="ocean-overlay absolute inset-0" />

        {/* 01 — Automatic scan */}
        <Scene isActive={active === 0} className="flex flex-col justify-center">
          <div className="flex flex-col gap-[18px] rounded-3xl border border-white/25 bg-white/15 p-7 backdrop-blur-[10px]">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[11.5px] font-bold tracking-[0.16em] text-oro">
                AI GOVERNANCE SCAN
              </span>
              <span className="text-xs text-bruma/80">Under 60 seconds</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {SCAN_FIELDS.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3"
                >
                  <span className="text-[12.5px] text-bruma/70">
                    {field.label}
                  </span>
                  <span
                    className={`font-heading text-[15px] font-semibold transition-colors duration-500 ${
                      scanStep >= field.filledAt ? "text-white" : "text-white/35"
                    }`}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Sweep and result share one block, so the card holds its height. */}
            <div className="relative min-h-[84px]">
              <Beat show={!scanned}>
                <div className="flex flex-col gap-3.5">
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      style={{ width: `${scanProgress}%` }}
                      className="h-full rounded-full bg-oro transition-[width] duration-[560ms] ease-out"
                    />
                  </div>
                  <div className="flex items-center gap-2.5 text-[13px] text-bruma/85">
                    <span className="h-[7px] w-[7px] flex-none rounded-full bg-cielo" />
                    {SCAN_SOURCES[scanSource]}
                  </div>
                </div>
              </Beat>
              {/* TODO: illustrative pre-score — the scan is not live yet */}
              <Beat show={scanned}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-[44px] font-bold leading-none text-white">
                      72
                    </span>
                    <span className="font-heading text-[17px] font-semibold text-bruma/70">
                      /100
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-full bg-oro px-[13px] py-[6px] font-heading text-[11.5px] font-bold tracking-[0.12em] text-marino">
                      HIGH CONFIDENCE
                    </span>
                    <span className="text-[12.5px] text-bruma/75">
                      Pre-score, nothing asked yet
                    </span>
                  </div>
                </div>
              </Beat>
            </div>
          </div>
        </Scene>

        {/* 02 — The questions the scan could not answer */}
        <Scene isActive={active === 1} className="flex items-center justify-center">
          <div className="w-full rounded-3xl border border-white/25 bg-white/15 p-7 pb-[22px] backdrop-blur-[10px]">
              <div className="mb-[22px] flex items-center justify-between">
                <span className="font-heading text-[11.5px] font-bold tracking-[0.16em] text-oro">
                  AI GOVERNANCE SCORECARD
                </span>
                <span className="text-xs text-bruma/80">
                  {question + 1} of {QUESTIONS.length}
                </span>
              </div>
              <div className="flex min-h-[112px] items-center">
                <p
                  style={{ transform: `translateY(${questionIn ? 0 : 8}px)` }}
                  className={`text-pretty font-heading text-[23px] font-medium leading-[1.32] text-white transition-[opacity,transform] duration-[350ms] ${
                    questionIn ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {QUESTIONS[question]}
                </p>
              </div>
              <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/20">
                <div
                  style={{
                    width: `${((question + 1) / QUESTIONS.length) * 100}%`,
                  }}
                  className="h-full rounded-full bg-oro transition-[width] duration-[600ms] ease-out"
                />
              </div>
              <div className="mt-3 text-xs text-bruma/75">
                Only what the scan couldn&rsquo;t answer on its own
              </div>
          </div>
        </Scene>

        {/* 03 — Where you stand, then the prices it earns */}
        <Scene isActive={active === 2} className="">
          <Beat show={!quoted}>
          <div className="flex flex-col gap-[22px] rounded-3xl border border-white/25 bg-white/15 p-7 backdrop-blur-[10px]">
          <div className="flex items-center gap-[26px]">
            {/* The labels sit below the arc rather than over it, so the round
                stroke caps can never land on top of the text. */}
            <div className="flex w-[186px] flex-none flex-col gap-1.5">
              <svg viewBox="0 0 200 112" className="h-auto w-full">
                <path
                  d="M14 100 A 86 86 0 0 1 186 100"
                  fill="none"
                  stroke="currentColor"
                  className="text-white/25"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M14 100 A 86 86 0 0 1 186 100"
                  fill="none"
                  stroke="currentColor"
                  className="text-oro transition-[stroke-dashoffset] duration-[1200ms] ease-out"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray="270"
                  strokeDashoffset={active === 2 ? 270 - 270 * 0.78 : 270}
                />
              </svg>
              <div className="flex justify-between text-[10.5px] tracking-[0.1em] text-bruma/70">
                <span>LOWER</span>
                <span>STRONGER</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span
                style={{ transform: `translateX(${active === 2 ? 0 : -12}px)` }}
                className={`self-start rounded-full bg-oro px-[15px] py-[7px] font-heading text-[13px] font-bold tracking-[0.12em] text-marino transition-[opacity,transform] delay-500 duration-500 ${
                  active === 2 ? "opacity-100" : "opacity-0"
                }`}
              >
                FORTIFIED
              </span>
              <div className="font-heading text-[17px] font-medium leading-[1.35] text-white">
                Your AI governance
                <br />
                holds up well
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-[13px] transition-[background-color,border-color,transform] duration-200 hover:translate-x-1 hover:border-white/50 hover:bg-white/25">
              <span className="h-[9px] w-[9px] flex-none rounded-full bg-cielo" />
              <span className="text-sm text-white">
                <strong className="font-bold">Strong:</strong> Human review process
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-[13px] transition-[background-color,border-color,transform] duration-200 hover:translate-x-1 hover:border-oro hover:bg-white/25">
              <span className="h-[9px] w-[9px] flex-none rounded-full bg-oro" />
              <span className="text-sm text-white">
                <strong className="font-bold">Watch:</strong> Data handling
              </span>
            </div>
          </div>
          </div>
          </Beat>

          <Beat show={quoted}>
          <div className="flex flex-col items-center justify-center gap-5">
          <div className="flex items-center justify-center gap-3">
            {QUOTES.map((quote) => (
              <div
                key={quote.name}
                style={{
                  width: quote.width,
                  transform: `rotate(${quoted ? quote.rotation : 0}deg) translateY(${
                    quoted ? quote.lift : 0
                  }px)`,
                }}
                className={`group flex cursor-pointer flex-col gap-2 rounded-[22px] border-[1.5px] p-5 px-4 backdrop-blur-[8px] transition-[transform,box-shadow,border-color] duration-500 ease-out hover:!rotate-0 hover:!translate-y-[-14px] hover:scale-[1.04] hover:border-oro ${
                  quote.featured
                    ? "border-oro bg-white"
                    : "border-white/25 bg-white/15"
                }`}
              >
                <div
                  className={`font-heading text-[11.5px] font-bold tracking-[0.14em] ${
                    quote.featured ? "text-oro-oscuro" : "text-bruma"
                  }`}
                >
                  {quote.name}
                </div>
                <div
                  style={{ fontSize: quote.size }}
                  className={`font-heading font-bold leading-none ${
                    quote.featured ? "text-marino" : "text-white"
                  }`}
                >
                  {money(quote.value)}
                </div>
                <div
                  className={`text-xs opacity-70 ${
                    quote.featured ? "text-marino" : "text-white"
                  }`}
                >
                  per year
                </div>
                <div
                  className={`mt-1.5 border-t pt-2.5 text-[12.5px] font-semibold ${
                    quote.featured
                      ? "border-marino/15 text-marino"
                      : "border-white/20 text-white"
                  }`}
                >
                  {quote.limit} limit
                </div>
              </div>
            ))}
          </div>
          <div className="text-[13px] text-bruma/85">
            Three options, ready to compare — no underwriter call.
          </div>
          </div>
          </Beat>
        </Scene>

        {/* 04 — Bind */}
        <Scene isActive={active === 3} className="flex flex-col justify-center">
          <div className="rounded-3xl border border-white/25 bg-white/15 p-7 py-[26px] backdrop-blur-[10px]">
            <div className="relative flex flex-col gap-[22px]">
              {/* The fill is a child of the track so its percentage measures
                  against the track itself, node to node. Both ends sit on a
                  dot centre: a row is 44px tall and the dot 20px, so the first
                  centre lands 22px down. */}
              <span className="absolute bottom-[18px] left-[9px] top-[22px] w-0.5 rounded-full bg-white/30">
                <span
                  style={{ height: `${timelineFill * 100}%` }}
                  className="block w-full rounded-full bg-oro transition-[height] duration-1000 ease-out"
                />
              </span>
              {BIND_STEPS.map((step, index) => (
                <div
                  key={step.name}
                  className="relative flex items-center gap-4 transition-transform duration-200 hover:translate-x-[5px]"
                >
                  <span
                    className={`h-5 w-5 flex-none rounded-full border-2 transition-[background-color,border-color] duration-[400ms] ${
                      bound > index
                        ? "border-oro bg-oro"
                        : "border-white/40 bg-white/15"
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={`font-heading text-base font-semibold text-white transition-opacity duration-[400ms] ${
                        bound > index ? "opacity-100" : "opacity-55"
                      }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-[12.5px] text-bruma/70">
                      {step.meta}
                    </span>
                  </div>
                </div>
              ))}
              {/* The badge is the fourth node of the timeline, so it carries a
                  dot of its own and sits in the same column as the labels. */}
              <div className="flex items-center gap-4">
                <span
                  className={`h-5 w-5 flex-none rounded-full border-2 transition-[background-color,border-color] duration-[400ms] ${
                    bound >= 4 ? "border-oro bg-oro" : "border-white/40 bg-white/15"
                  }`}
                />
                <span
                  style={{ transform: `scale(${bound >= 4 ? 1 : 0.85})` }}
                  className={`inline-flex origin-left items-center gap-2 rounded-full bg-white px-4 py-2 font-heading text-[13px] font-bold tracking-[0.08em] text-marino shadow-[0_0_20px_color-mix(in_srgb,var(--color-cielo)_65%,transparent)] transition-[opacity,transform] duration-500 ease-out ${
                    bound >= 4 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ACTIVE!
                </span>
              </div>
            </div>
          </div>
        </Scene>
      </div>
    </div>
  );
}
