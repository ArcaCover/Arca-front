"use client";

import { useEffect, useRef, useState } from "react";

// The panel is designed at a fixed size and scaled to fit its column, which
// keeps every scene laid out exactly as approved at any viewport width.
const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 420;

const QUESTIONS = [
  "Which AI tools does your firm use for client work?",
  "Who reviews AI-assisted work before it leaves the firm?",
  "Does client data ever go into a consumer AI tool?",
  "Do you have a written AI policy your team follows?",
];

// TODO: replace placeholder premiums with real rates before launch
const QUOTES = [
  { name: "GOOD", value: 3150, limit: "$500K", rotation: -7, lift: 10, width: 148, size: 25, featured: false },
  { name: "BETTER", value: 4420, limit: "$1M", rotation: 0, lift: -8, width: 172, size: 30, featured: true },
  { name: "BEST", value: 6900, limit: "$2M", rotation: 7, lift: 10, width: 148, size: 25, featured: false },
];

const BIND_STEPS = [
  { name: "Signed", meta: "Warranty statement · e-signature" },
  { name: "Payment confirmed", meta: "Annual · 5% discount applied" },
  { name: "Policy issued", meta: "Documents in your inbox" },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(1);
  const [question, setQuestion] = useState(0);
  const [questionIn, setQuestionIn] = useState(true);
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
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (paused || prefersReducedMotion()) {
      video.pause();
      return;
    }
    video.play().catch(() => {});
  }, [paused]);

  // Each scene runs its own little sequence, restarted whenever it becomes the
  // active one and stopped while the section is off screen.
  useEffect(() => {
    if (paused) {
      return;
    }

    if (active === 0) {
      setQuestion(0);
      setQuestionIn(true);
      let fade: ReturnType<typeof setTimeout>;
      const rotate = setInterval(() => {
        setQuestionIn(false);
        fade = setTimeout(() => {
          setQuestion((current) => (current + 1) % QUESTIONS.length);
          setQuestionIn(true);
        }, 340);
      }, 1900);
      return () => {
        clearInterval(rotate);
        clearTimeout(fade);
      };
    }

    if (active === 2) {
      setCountProgress(0);
      const start = performance.now();
      const count = setInterval(() => {
        const linear = Math.min(1, (performance.now() - start) / 1100);
        setCountProgress(1 - Math.pow(1 - linear, 3));
        if (linear >= 1) {
          clearInterval(count);
        }
      }, 40);
      return () => clearInterval(count);
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

  const count = active === 2 ? countProgress : 0;
  const bound = active === 3 ? boundStep : 0;
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
        {/* TODO: re-encode ocean.mp4 before launch — 13 MB for a 5s loop */}
        <video
          ref={videoRef}
          src="/videos/ocean.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="ocean-overlay absolute inset-0" />

        {/* 01 — Scorecard questionnaire */}
        <Scene isActive={active === 0} className="flex items-center justify-center">
          <div className="w-full rounded-3xl border border-white/25 bg-white/15 p-7 pb-[22px] backdrop-blur-[10px]">
            <div className="mb-[22px] flex items-center justify-between">
              <span className="font-heading text-[11.5px] font-bold tracking-[0.16em] text-oro">
                AI GOVERNANCE SCORECARD
              </span>
              <span className="text-xs text-bruma/80">{question + 1} of 20</span>
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
                style={{ width: `${12 + question * 22}%` }}
                className="h-full rounded-full bg-oro transition-[width] duration-[600ms] ease-out"
              />
            </div>
            <div className="mt-3 text-xs text-bruma/75">
              About 10 minutes · tools, oversight, client data
            </div>
          </div>
        </Scene>

        {/* 02 — Where you stand */}
        <Scene isActive={active === 1} className="flex flex-col justify-center gap-[22px]">
          <div className="flex items-center gap-[26px]">
            <div className="relative h-[106px] w-[186px] flex-none">
              <svg viewBox="0 0 200 112" className="h-full w-full overflow-visible">
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
                  strokeDashoffset={active === 1 ? 270 - 270 * 0.78 : 270}
                />
              </svg>
              <div className="absolute inset-x-0 -bottom-0.5 flex justify-between text-[10.5px] tracking-[0.1em] text-bruma/70">
                <span>LOWER</span>
                <span>STRONGER</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span
                style={{ transform: `translateX(${active === 1 ? 0 : -12}px)` }}
                className={`self-start rounded-full bg-oro px-[15px] py-[7px] font-heading text-[13px] font-bold tracking-[0.12em] text-marino transition-[opacity,transform] delay-500 duration-500 ${
                  active === 1 ? "opacity-100" : "opacity-0"
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
        </Scene>

        {/* 03 — Quote options */}
        <Scene
          isActive={active === 2}
          className="flex flex-col items-center justify-center gap-5"
        >
          <div className="flex items-center justify-center gap-3">
            {QUOTES.map((quote) => (
              <div
                key={quote.name}
                style={{
                  width: quote.width,
                  transform: `rotate(${active === 2 ? quote.rotation : 0}deg) translateY(${
                    active === 2 ? quote.lift : 0
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
        </Scene>

        {/* 04 — Bind */}
        <Scene isActive={active === 3} className="flex flex-col justify-center">
          <div className="rounded-3xl border border-white/25 bg-white/15 p-7 py-[26px] backdrop-blur-[10px]">
            <div className="relative flex flex-col gap-[22px]">
              <span className="absolute bottom-8 left-[9px] top-3 w-0.5 bg-white/30" />
              <span
                style={{ height: `${bound >= 3 ? 78 : bound * 26}%` }}
                className="absolute left-[9px] top-3 w-0.5 bg-oro transition-[height] duration-1000 ease-out"
              />
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
              <div className="flex items-center gap-4">
                <span className="h-5 w-5 flex-none" />
                <span
                  style={{ transform: `scale(${bound >= 4 ? 1 : 0.85})` }}
                  className={`inline-flex items-center gap-2 rounded-full bg-cielo px-4 py-2 font-heading text-[13px] font-bold tracking-[0.08em] text-marino transition-[opacity,transform] duration-500 ease-out ${
                    bound >= 4 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </Scene>
      </div>
    </div>
  );
}
