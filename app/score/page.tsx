"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, HelpCircle, Info, Loader2 } from "lucide-react";

import RefineCta from "@/components/assessment/RefineCta";
import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { DomainBar, ScoreGauge, SignalCard, TierBadge } from "@/components/score";
import { WEBSITE_UNREAD_NOTICE, adaptScore, notRatedSentence, type ScoreView } from "@/lib/api/adapt";
import { ApiError, downloadReport, pollScan } from "@/lib/api/client";
import { saveFile } from "@/lib/api/download";
import { forgetSession, recallSession } from "@/lib/api/session";
import { publishDebugState } from "@/lib/debug/bridge";

// One notice, three cases. The sentences never name a decision: Layer 1 makes none here (CLAUDE.md §7).
function evidenceNotice({ evidence, decisionWithheld, notRated }: ScoreView): string {
  // The website could not be read at all: no public evidence, so no score from it. One notice says so and points to the
  // assessment, which scores the answers alone. Low confidence, not high risk: no risk group, no manual review (DN-12 §14).
  if (evidence.kind === "website_unavailable") return `${WEBSITE_UNREAD_NOTICE} This is not a coverage decision.`;
  // With no score on the page, the notice only says which sources fell short; why there is no score is said once, in
  // the place of the score.
  if (notRated) {
    const sources = evidence.kind === "complete"
      ? "All three public sources answered: your website, the Florida Bar register and Avvo."
      : evidence.gaps.length ? evidence.gaps.join(" ") : "Part of the public evidence could not be read.";
    return `${sources} This is not a coverage decision.`;
  }
  if (evidence.kind === "complete") {
    return `All three public sources answered: your website, the Florida Bar register and Avvo.${
      decisionWithheld ? " What they show is not enough for a coverage decision on its own." : ""
    }`;
  }
  const gaps = evidence.gaps.length
    ? `${evidence.gaps.join(" ")} This score rests on less evidence than usual.`
    : "Part of the public evidence could not be read, so this score rests on less evidence than usual.";
  return `${gaps}${decisionWithheld ? " It is not enough for a coverage decision on its own." : ""}`;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; view: ScoreView }
  | { kind: "failed"; message: string };

function ScoreScreen({ scanId }: { scanId: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // What the poll published last. The panel keeps one state per page, so the download's outcome is published beside it.
  const published = useRef<Record<string, unknown>>({ scanId });

  // The API renders the report from the stored result, so the PDF says exactly what this
  // screen says.
  async function saveReport(id: string) {
    const token = recallSession(id);
    if (!token) {
      router.replace("/quote");
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const file = await downloadReport(id, token);
      saveFile(file);
      publishDebugState("score", { ...published.current, download: { status: "saved", filename: file.filename } });
    } catch (error) {
      publishDebugState("score", {
        ...published.current,
        download: { status: `error: ${error instanceof ApiError ? error.code : "unexpected"}` },
      });
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
          published.current = {
            scanId,
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
          };
          publishDebugState("score", published.current);
          setState({ kind: "ready", view: adaptScore(poll.result, poll.status) });
          return;
        }
        if (poll.status === "FAILED") {
          publishDebugState("score", { scanId, status: poll.status, cached: poll.cached });
          forgetSession(scanId);
          setState({ kind: "failed", message: "This scan did not produce a score." });
          return;
        }
        // Still running: the user reached this URL before the scan landed.
        router.replace(`/quote/scanning?scan=${encodeURIComponent(scanId)}`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        publishDebugState("score", {
          scanId,
          status: `error: ${error instanceof ApiError ? error.code : "unexpected"}`,
          cached: null,
        });
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

  const { firm, score, tier, confidence, categories, signals, evidence, notRated, floridaOnly } = state.view;
  // With no score to show there is little below to look at, so the assessment comes first.
  const assessmentFirst = notRated !== null;
  const location = [firm.city, firm.state].filter(Boolean).join(", ");
  const details = [location, firm.practice].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[960px] px-6 py-10 sm:px-8 lg:py-14">
        <header>
          <ArcaWordmark className="h-7 w-auto text-marino" />
        </header>

        <p
          role="note"
          aria-label="About this score"
          className={`mt-8 flex items-start gap-2 rounded-xl px-4 py-3 text-sm text-marino ${
            evidence.kind === "complete" ? "bg-bruma/60" : "bg-oro/10"
          }`}
        >
          {evidence.kind === "complete" ? (
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-marino/60" />
          ) : (
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-oro-oscuro" />
          )}
          <span>{evidenceNotice(state.view)}</span>
        </p>

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
            {/* Up here, not at the end of the page: the gold action below leads away to the assessment. */}
            <div className="mt-6 flex flex-col items-center md:items-start">
              <button
                type="button"
                onClick={() => void saveReport(scanId)}
                disabled={downloading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-marino/30 px-5 py-2.5 text-sm font-semibold text-marino transition-colors hover:border-marino hover:bg-marino/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino disabled:cursor-wait disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Download aria-hidden className="h-4 w-4" />
                )}
                {downloading ? "Preparing your report…" : "Download report (PDF)"}
              </button>
              {downloadError && (
                <p role="alert" className="mt-2 text-sm text-rojo">
                  {downloadError}
                </p>
              )}
            </div>
          </div>

          {notRated?.reason === "website_unavailable" ? (
            // No public evidence at all: a 0 and CRITICAL here would read as a verdict on a firm nobody could see. The
            // notice above says why, once; this only marks the place of the score as low confidence.
            <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center rounded-2xl bg-bruma/50 px-6 py-7 text-center">
              <HelpCircle aria-hidden className="h-8 w-8 text-marino/50" />
              <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-marino">
                No score from public evidence
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-marino/70">Confidence: low</p>
            </div>
          ) : notRated ? (
            // Too little evidence to rate: a number and a tier here would read as a judgement of the firm.
            <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center rounded-2xl bg-bruma/50 px-6 py-7 text-center">
              <HelpCircle aria-hidden className="h-8 w-8 text-marino/50" />
              <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-marino">
                Not enough evidence to rate
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-marino/70">
                {notRatedSentence(notRated.evaluated)} The assessment below fills in what public sources cannot show.
              </p>
            </div>
          ) : (
            <div className="flex w-full max-w-[300px] shrink-0 flex-col items-center">
              {/* Both take the tier the API sent, so they cannot disagree. */}
              <ScoreGauge score={score} tier={tier} />
              <div className="mt-5">
                <TierBadge tier={tier} />
              </div>
              <p className="mt-3 text-xs text-marino/50">Confidence: {confidence.toLowerCase()}</p>
            </div>
          )}
        </section>

        {/* With no website to read, or too little evidence to rate, there is little below to look at, so the
            assessment comes first. */}
        {assessmentFirst && (
          <section className="mt-12 flex flex-col items-center">
            <RefineCta key={scanId} scanId={scanId} />
          </section>
        )}

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
                caption={
                  !category.scored
                    ? "context only, not scored"
                    : category.status === "KNOWN"
                    ? undefined
                    : category.status === "UNKNOWN"
                      ? "no evidence"
                      : "partial evidence"
                }
              />
            ))}
          </div>
          {/* Some attorneys are licensed outside Florida and were left out of the Florida Bar rules: said once, here. */}
          {floridaOnly && (
            <p className="mt-5 flex items-start gap-2 text-sm text-marino/60">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{floridaOnly}</span>
            </p>
          )}
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

        {!assessmentFirst && (
          <section className="mt-16 flex flex-col items-center">
            <RefineCta key={scanId} scanId={scanId} />
          </section>
        )}

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
