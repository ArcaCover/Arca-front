"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { ApiError, pollScan } from "@/lib/api/client";
import { forgetSession, recallSession } from "@/lib/api/session";

// What Layer 1 actually reads: the firm's website, the Florida Bar register and Avvo.
// Nothing here promises a source the scan does not have (CLAUDE.md §7).
const MESSAGES = [
  "Scanning your firm's website...",
  "Looking for an AI usage policy...",
  "Reading your privacy and disclosure pages...",
  "Checking Florida Bar standing records...",
  "Reviewing peer ratings and client reviews...",
  "Calculating your AI Governance Score...",
];

const ROTATION_MS = 3500;

// Poll tightly while the scan is likely to land, then back off. The API gives no hint of how
// long it needs, so the cadence is ours to choose.
const FAST_POLL_MS = 2000;
const SLOW_POLL_MS = 5000;
const BACK_OFF_AFTER_MS = 30_000;

// The copy promises under 60 seconds. The pipeline's own ceiling is ten minutes, so at a
// minute we change what we say rather than either lying or giving up.
const SLOW_AFTER_MS = 60_000;
const EXPECTED_MS = 60_000;
const GIVE_UP_AFTER_MS = 660_000;

const DONE_PAUSE_MS = 900;

// The bar stops short of the end while it is working: the jump to 100% should
// read as the scan arriving, not as the bar correcting itself.
const PROGRESS_TARGET = 90;

type Phase =
  | { kind: "polling" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

function ScanningScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const scanId = params.get("scan");

  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "polling" });
  const orbRef = useRef<HTMLDivElement>(null);

  // Landing here without a scan means there is nothing to wait for. Replace rather than
  // push, so Back does not bounce into a dead URL.
  useEffect(() => {
    if (!scanId) router.replace("/quote");
  }, [scanId, router]);

  useEffect(() => {
    if (!scanId) return;
    const token = recallSession(scanId);
    if (!token) {
      // No token means this tab never started the scan, or it was closed and reopened.
      router.replace("/quote");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();

    const stop = (next: Phase) => {
      if (cancelled) return;
      setPhase(next);
      if (next.kind === "done") setProgress(100);
    };

    async function tick() {
      if (cancelled) return;
      const waited = Date.now() - started;
      try {
        const poll = await pollScan(scanId!, token!);
        if (cancelled) return;

        if (poll.status === "RUNNING") {
          // The API reports how long it has been working; the bar follows that rather than
          // a timer of our own, so it cannot drift away from the real scan.
          setProgress(Math.min(PROGRESS_TARGET, (poll.elapsed / EXPECTED_MS) * PROGRESS_TARGET));
          if (poll.elapsed >= SLOW_AFTER_MS) setSlow(true);
          if (waited >= GIVE_UP_AFTER_MS) {
            stop({ kind: "failed", message: "The scan is taking longer than expected." });
            return;
          }
          timer = setTimeout(tick, waited >= BACK_OFF_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS);
          return;
        }

        if (poll.status === "FAILED") {
          // A failed scan carries no result, so there is nothing to show on /score.
          forgetSession(scanId!);
          stop({ kind: "failed", message: "We could not read enough about your firm to score it." });
          return;
        }

        // COMPLETED or PARTIAL. A partial scan still has a score; /score says so plainly.
        stop({ kind: "done" });
        timer = setTimeout(() => {
          if (!cancelled) router.push(`/score?scan=${encodeURIComponent(scanId!)}`);
        }, DONE_PAUSE_MS);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.code === "unauthorized" || error.code === "not_found")) {
          forgetSession(scanId!);
          router.replace("/quote");
          return;
        }
        // A blip in the network is not a failed scan: keep polling until we run out of patience.
        if (waited < GIVE_UP_AFTER_MS) {
          timer = setTimeout(tick, SLOW_POLL_MS);
          return;
        }
        stop({
          kind: "failed",
          message: error instanceof ApiError ? error.message : "We lost contact with the scan service.",
        });
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId, router]);

  // Message reel and orb pulse. Purely decorative, and independent of the polling above.
  useEffect(() => {
    if (phase.kind !== "polling") return;

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
      clearInterval(rotation);
      pulse?.cancel();
    };
  }, [phase.kind]);

  if (!scanId) return null;

  if (phase.kind === "failed") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-[480px] flex-col items-center text-center">
          <ArcaWordmark className="h-7 w-auto text-marino" />
          <AlertTriangle aria-hidden className="mt-16 h-10 w-10 text-oro-oscuro" />
          <h1 className="mt-6 font-heading text-xl font-semibold tracking-tight text-marino">
            We couldn&apos;t finish your scan
          </h1>
          <p role="alert" className="mt-3 text-[15px] leading-relaxed text-marino/60">
            {phase.message} This usually means the site blocked us or a records source was
            unavailable. You can try again, or use a different address for your firm.
          </p>
          <button
            type="button"
            onClick={() => router.push("/quote")}
            className="cta-glow group mt-8 inline-flex cursor-pointer items-center gap-3 rounded-full bg-oro py-2.5 pl-6 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
          >
            Try another scan
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
              <RotateCcw aria-hidden className="h-4 w-4" />
            </span>
          </button>
        </div>
      </main>
    );
  }

  const done = phase.kind === "done";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[480px] flex-col items-center">
        <ArcaWordmark className="h-7 w-auto text-marino" />

        <div
          ref={orbRef}
          aria-hidden
          className="orb-sphere mt-16 h-[120px] w-[120px] rounded-full [will-change:transform]"
        />

        {done ? (
          <p className="mt-16 flex h-7 items-center gap-2 font-heading text-lg text-marino">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-cielo" />
            Your results are ready.
          </p>
        ) : (
          /* One line tall with the overflow clipped, so the messages read as a
             reel: the outgoing line leaves through the top while the next one
             climbs in from below. */
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
        )}

        <p className="mt-3 text-sm text-marino/45">
          {slow && !done
            ? "Taking a little longer than usual — we're still working."
            : "This usually takes less than 60 seconds."}
        </p>

        <div className="mt-10 h-1 w-[280px] overflow-hidden rounded-full bg-bruma">
          <div
            className="h-full rounded-full bg-cielo transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </main>
  );
}

export default function ScanningPage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <ScanningScreen />
    </Suspense>
  );
}
