"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

import RefineCta from "@/components/assessment/RefineCta";
import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { DomainBar, ScoreGauge, SignalCard, TierBadge } from "@/components/score";
import { adaptScore, type ScoreView } from "@/lib/api/adapt";
import { ApiError, downloadReport, pollScan } from "@/lib/api/client";
import { forgetSession, recallSession } from "@/lib/api/session";
import { publishDebugState } from "@/lib/debug/bridge";

type State =
  | { kind: "loading" }
  | { kind: "ready"; view: ScoreView }
  | { kind: "failed"; message: string };

function ScoreScreen({ scanId }: { scanId: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // The API renders the report from the stored result, so the PDF says exactly what this
  // screen says. The file is handed to the browser through a temporary object URL.
  async function saveReport(id: string) {
    const token = recallSession(id);
    if (!token) {
      router.replace("/quote");
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const { blob, filename } = await downloadReport(id, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (error instanceof ApiError && error.code === "unauthorized") {
        forgetSession(id);
        router.replace("/quote");
        return;
      }
      setDownloadError("We could not prepare your report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

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
          // Picked field by field from the raw poll: the result also carries the email, which never leaves this page.
          publishDebugState("score", {
            status: poll.status,
            cached: poll.cached,
            meta: poll.result.meta,
            sources: poll.result.sources,
            preScore: {
              total: poll.result.preScore.total,
              tier: poll.result.preScore.tier,
              decision: poll.result.preScore.decision,
              confidence: poll.result.preScore.confidence,
              assessmentStatus: poll.result.preScore.assessmentStatus,
              flags: poll.result.preScore.flags,
            },
            identity: { status: poll.result.identity?.status ?? null },
          });
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
          <RefineCta key={scanId} scanId={scanId} />

          <button
            type="button"
            onClick={() => void saveReport(scanId)}
            disabled={downloading}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-marino/60 underline-offset-4 transition-colors hover:text-marino hover:underline disabled:cursor-wait disabled:no-underline"
          >
            {downloading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {downloading ? "Preparing your report…" : "Download Quick Scan Report"}
          </button>
          {downloadError && (
            <p role="alert" className="mt-2 text-sm text-rojo">
              {downloadError}
            </p>
          )}
        </section>

        <footer className="mt-20 text-center text-xs text-marino/45">© 2026 Arca</footer>
      </div>
    </div>
  );
}

function ScoreRoute() {
  const scanId = useSearchParams().get("scan");
  return <ScoreScreen key={scanId} scanId={scanId} />;
}

export default function ScorePage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <ScoreRoute />
    </Suspense>
  );
}
