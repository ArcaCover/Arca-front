"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Info, Loader2 } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { DomainBar, ScoreGauge, SignalCard, TierBadge } from "@/components/score";
import { adaptScore, type ScoreView } from "@/lib/api/adapt";
import { ApiError, pollScan } from "@/lib/api/client";
import { forgetSession, recallSession } from "@/lib/api/session";

type State =
  | { kind: "loading" }
  | { kind: "ready"; view: ScoreView }
  | { kind: "failed"; message: string };

function ScoreScreen() {
  const router = useRouter();
  const scanId = useSearchParams().get("scan");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!scanId) {
      router.replace("/quote");
      return;
    }
    const token = recallSession(scanId);
    if (!token) {
      router.replace("/quote");
      return;
    }

    let cancelled = false;
    // Re-read the result rather than carrying it through navigation state, so that
    // /score?scan=... is reproducible from the URL alone.
    void pollScan(scanId, token)
      .then((poll) => {
        if (cancelled) return;
        if (poll.status === "COMPLETED" || poll.status === "PARTIAL") {
          setState({ kind: "ready", view: adaptScore(poll.result, poll.status) });
          return;
        }
        if (poll.status === "FAILED") {
          forgetSession(scanId);
          setState({ kind: "failed", message: "This scan did not produce a score." });
          return;
        }
        // Still running: the user reached this URL before the scan landed.
        router.replace(`/quote/scanning?scan=${encodeURIComponent(scanId)}`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.code === "unauthorized" || error.code === "not_found")) {
          forgetSession(scanId);
          router.replace("/quote");
          return;
        }
        setState({
          kind: "failed",
          message: error instanceof ApiError ? error.message : "We could not load your results.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [scanId, router]);

  if (!scanId || state.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <Loader2 aria-label="Loading your results" className="h-8 w-8 animate-spin text-cielo" />
      </main>
    );
  }

  if (state.kind === "failed") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-[480px] flex-col items-center text-center">
          <ArcaWordmark className="h-7 w-auto text-marino" />
          <AlertTriangle aria-hidden className="mt-16 h-10 w-10 text-oro-oscuro" />
          <h1 className="mt-6 font-heading text-xl font-semibold tracking-tight text-marino">
            We couldn&apos;t show your results
          </h1>
          <p role="alert" className="mt-3 text-[15px] leading-relaxed text-marino/60">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => router.push("/quote")}
            className="mt-8 cursor-pointer text-sm text-marino/60 underline-offset-4 transition-colors hover:text-marino hover:underline"
          >
            Start a new scan
          </button>
        </div>
      </main>
    );
  }

  const { firm, score, tier, confidence, categories, signals, incomplete, decisionWithheld } = state.view;
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const details = [location, firm.practice].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[960px] px-6 py-10 sm:px-8 lg:py-14">
        <header>
          <ArcaWordmark className="h-7 w-auto text-marino" />
        </header>

        {incomplete && (
          <p className="mt-8 flex items-start gap-2 rounded-xl bg-oro/10 px-4 py-3 text-sm text-marino">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-oro-oscuro" />
            <span>
              One or more sources did not answer, so this score rests on less evidence than
              usual.
              {decisionWithheld && " It is not enough for a coverage decision on its own."}
            </span>
          </p>
        )}

        <section className="mt-8 flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
          <div className="text-center md:text-left">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-marino sm:text-4xl">
              {firm.name}
            </h1>
            {details && <p className="mt-3 text-[15px] text-marino/55">{details}</p>}
            {firm.attorneys !== null && (
              <p className="text-[15px] text-marino/55">
                {firm.attorneys} {firm.attorneys === 1 ? "lawyer" : "lawyers"}
              </p>
            )}
          </div>

          <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center">
            {/* Both take the tier the API sent, so they cannot disagree. */}
            <ScoreGauge score={score} tier={tier} />
            <div className="mt-5">
              <TierBadge tier={tier} />
            </div>
            <p className="mt-3 text-xs text-marino/50">Confidence: {confidence}</p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Score breakdown
          </h2>
          <p className="mt-2 text-[15px] text-marino/55">
            What the scan could observe from public evidence, scored against each category&apos;s
            ceiling.
          </p>
          <div className="mt-6 space-y-5">
            {categories.map((category) => (
              <DomainBar
                key={category.key}
                name={category.label}
                score={category.score}
                max={category.max}
                caption={category.status === "KNOWN" ? undefined : "partial evidence"}
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-marino">
            Signals detected
          </h2>
          {signals.length ? (
            <div className="mt-6 space-y-3">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <p className="mt-6 flex items-center gap-2 text-sm text-marino/55">
              <Info aria-hidden className="h-4 w-4 shrink-0" />
              The scan could not confirm any individual signal for this firm.
            </p>
          )}
        </section>

        <section className="mt-16 flex flex-col items-center">
          <button
            type="button"
            onClick={() => router.push(`/assessment?scan=${encodeURIComponent(scanId)}`)}
            className="cta-glow group inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
          >
            Complete full assessment
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              // TODO: generate PDF
            }}
            className="mt-5 cursor-pointer text-sm text-marino/60 underline-offset-4 transition-colors hover:text-marino hover:underline"
          >
            Download Quick Scan Report
          </button>
        </section>

        <footer className="mt-20 text-center text-xs text-marino/45">© 2026 Arca</footer>
      </div>
    </div>
  );
}

export default function ScorePage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <ScoreScreen />
    </Suspense>
  );
}
