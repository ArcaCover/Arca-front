"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { isUnderwritingResult, type AssessmentResult } from "@arca/contracts";
import SaveResultsCta from "@/components/app/SaveResultsCta";
import AssessmentShell from "@/components/assessment/AssessmentShell";
import UnderwritingOutcome from "@/components/assessment/UnderwritingOutcome";
import { completedOn, versionLine } from "@/components/assessment/result-meta";
import {
  ANSWERS_ONLY_LINE,
  answersOnly,
  resultNotes,
} from "@/components/assessment/result-notes";
import { DomainBar, ScoreGauge, TierBadge } from "@/components/score";
import {
  ApiError,
  downloadAssessmentReport,
  getAssessmentResult,
} from "@/lib/api/client";
import { saveFile } from "@/lib/api/download";
import { recallSession } from "@/lib/api/session";
import { recallAssessment } from "@/lib/api/assessment-session";
import { assessmentHref } from "@/lib/assessment";
import { publishDebugState } from "@/lib/debug/bridge";

const SESSION_ENDED =
  "This session has ended, so the report can no longer be downloaded here.";

// The API closes every step with the same caveat. The plan's heading says it
// once, so each step keeps only its own words.
function nextStep(detail: string): string {
  return detail
    .replace(/^Illustrative next step:/, "Next step:")
    .replace(
      /\s*This estimate is independent of other steps and is not a pricing or coverage promise\.$/,
      "",
    );
}

function ResultsScreen() {
  const params = useSearchParams();
  const scanId = params.get("scan");
  const requestedId = params.get("a");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(requestedId);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // What the load published last. The panel keeps one state per page, so the
  // download's outcome is published beside it.
  const published = useRef<Record<string, unknown>>({ scanId });

  // The API renders the report from the stored assessment, not from this page.
  async function saveReport() {
    const token = scanId ? recallSession(scanId) : null;
    if (!assessmentId || !token) {
      setDownloadError(SESSION_ENDED);
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const file = await downloadAssessmentReport(assessmentId, token);
      saveFile(file);
      publishDebugState("results", {
        ...published.current,
        download: { status: "saved", filename: file.filename },
      });
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : "unexpected";
      publishDebugState("results", {
        ...published.current,
        download: { status: `error: ${code}` },
      });
      setDownloadError(
        code === "unauthorized" || code === "expired"
          ? SESSION_ENDED
          : "We could not prepare your report. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const id = requestedId ?? (scanId ? recallAssessment(scanId) : null);
    const token = scanId ? recallSession(scanId) : null;
    setAssessmentId(id);
    setLoading(true);
    setError(null);
    setErrorCode(null);
    if (!scanId || !id || !token) {
      setError(
        "This tab no longer has access to the result. Sessions last up to 24 hours; a new scan starts a new assessment.",
      );
      setErrorCode("expired");
      setLoading(false);
      return;
    }
    void getAssessmentResult(id, token)
      .then((value) => {
        if (cancelled) return;
        if (value.scanId !== scanId)
          throw new ApiError(
            "unauthorized",
            "This result does not belong to this scan.",
          );
        published.current = {
          scanId: value.scanId,
          layer1Score: value.layer1Score,
          compositeScore: value.compositeScore,
          tier: value.tier,
          flags: value.flags,
          bankVersion: value.bankVersion,
          scoringVersion: value.scoringVersion,
          ...(isUnderwritingResult(value)
            ? { configVersion: value.configVersion, confidence: value.confidence, exposure: value.exposure,
                outcome: value.outcome, audit: value.audit, underwriterSummary: value.underwriterSummary }
            : { layer2Score: value.layer2Score }),
        };
        publishDebugState("results", published.current);
        setResult(value);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        publishDebugState("results", { scanId, error: cause instanceof ApiError ? cause.code : "unexpected" });
        setError(
          cause instanceof ApiError
            ? cause.message
            : "We couldn’t load your result. Please try again.",
        );
        setErrorCode(cause instanceof ApiError ? cause.code : "network");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scanId, requestedId, attempt]);

  const notes = result ? resultNotes(result.flags) : [];

  return (
    <AssessmentShell
      scanId={scanId}
      results
      title="Small steps. Stronger foundations."
      description="A clearer view of your AI practices, and practical places to focus next. This is the beginning of better governance."
    >
      {loading ? (
        <section className="flex min-h-[350px] flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center">
          <Loader2
            aria-hidden
            className="h-7 w-7 animate-spin text-cielo motion-reduce:animate-none"
          />
          <h2 role="status" className="mt-5 font-heading text-xl text-marino">
            Bringing your outlook together…
          </h2>
        </section>
      ) : error ? (
        <section className="rounded-[28px] border border-marino/10 bg-white p-7 sm:p-9">
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            Your result needs a moment.
          </h2>
          <p role="alert" className="mt-4 text-sm leading-7 text-marino/75">
            {error}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!["expired", "unauthorized", "not_found"].includes(
              errorCode ?? "",
            ) && (
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-oro px-5 py-3 text-sm font-semibold"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                Try again
              </button>
            )}
            {["not_ready", "incomplete"].includes(errorCode ?? "") &&
            assessmentId &&
            scanId ? (
              <Link
                href={assessmentHref(scanId, assessmentId)}
                className="rounded-full border border-marino/15 px-5 py-3 text-sm"
              >
                Return to assessment
              </Link>
            ) : (
              <Link
                href="/quote"
                className="rounded-full border border-marino/15 px-5 py-3 text-sm"
              >
                Start a new scan
              </Link>
            )}
          </div>
        </section>
      ) : (
        result && (
          <>
            <section className="overflow-hidden rounded-[28px] border border-marino/8 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-marino/70">
                <FileCheck2 aria-hidden className="h-4 w-4" />
                Your outlook
              </div>
              {/* On a phone the report button sits right under the badge, inside the first screen as on /score, and the
                  explanation follows it; from sm up the gauge spans both rows beside the explanation and the button. */}
              <div className="mt-7 grid justify-items-center gap-5 sm:grid-cols-[230px_minmax(0,1fr)] sm:items-center sm:justify-items-start sm:gap-x-8">
                <div
                  className="w-full max-w-[230px] sm:row-span-2"
                >
                  <ScoreGauge
                    score={result.compositeScore}
                    tier={result.tier}
                  />
                  <div className="mt-4 text-center">
                    <TierBadge tier={result.tier} />
                  </div>
                </div>
                <div
                  className="order-last text-center sm:order-none sm:self-end sm:text-left"
                >
                  <h2 className="font-heading text-xl font-medium tracking-tight text-marino">
                    {result.compositeScore === null
                      ? "More evidence is needed."
                      : "Your practices, in perspective."}
                  </h2>
                  <p className="mt-3 text-xs leading-6 text-marino/70">
                    {/* The website could not be read: the score is the answers alone, said plainly in one line, as low
                        confidence and never as a risk group (DN-12 §14). */}
                    {answersOnly(result)
                      ? ANSWERS_ONLY_LINE
                      : result.compositeScore === null
                        ? "The quick scan did not support a combined score. Your questionnaire score is still available below."
                        : isUnderwritingResult(result)
                          ? "Your public evidence plus your answers, category by category. The score is how well your firm manages the risk; confidence is how much of it we could verify."
                          : "This score combines the public evidence with your answers. It is a starting point for reviewing your AI practices."}
                  </p>
                </div>
                {/* Secondary on purpose: gold stays for the primary action of a screen. */}
                <div
                  className="flex flex-col items-center sm:items-start sm:self-start"
                >
                    <button
                      type="button"
                      onClick={() => void saveReport()}
                      disabled={downloading}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-marino/30 px-5 py-2.5 text-sm font-semibold text-marino transition-colors hover:border-marino hover:bg-marino/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino disabled:cursor-wait disabled:opacity-60"
                    >
                      {downloading ? (
                        <Loader2
                          aria-hidden
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <Download aria-hidden className="h-4 w-4" />
                      )}
                      {downloading
                        ? "Preparing your report…"
                        : "Download report (PDF)"}
                    </button>
                    <p className="mt-2 text-[11px] leading-5 text-marino/70">
                      The download works during this 24-hour session.
                    </p>
                    {downloadError && (
                      <p role="alert" className="mt-1 text-sm text-rojo">
                        {downloadError}
                      </p>
                    )}
                </div>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-marino/10 pt-6">
                <div className="rounded-2xl bg-bruma/35 p-4">
                  <p className="text-[11px] text-marino/70">
                    Public evidence · Layer 1
                  </p>
                  <p className="mt-2 font-heading text-2xl font-medium tabular-nums">
                    {result.layer1Score === null
                      ? "Not scored"
                      : result.layer1Score}
                    <span className="ml-1 text-xs font-normal text-marino/70">
                      {result.layer1Score !== null && "/ 100"}
                    </span>
                  </p>
                </div>
                {isUnderwritingResult(result) ? (
                  <div className="rounded-2xl bg-bruma/35 p-4">
                    <p className="text-[11px] text-marino/70">Confidence</p>
                    <p className="mt-2 font-heading text-2xl font-medium capitalize">
                      {result.confidence.level.toLowerCase()}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-bruma/35 p-4">
                    <p className="text-[11px] text-marino/70">
                      Your answers · Layer 2
                    </p>
                    <p className="mt-2 font-heading text-2xl font-medium tabular-nums">
                      {result.layer2Score}
                      <span className="ml-1 text-xs font-normal text-marino/70">
                        / 100
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </section>
            {isUnderwritingResult(result) && <UnderwritingOutcome outcome={result.outcome} />}
            <section className="mt-7 rounded-[28px] border border-marino/8 bg-white p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-marino/70">
                {isUnderwritingResult(result) ? "Three categories. One score." : "Six areas. One picture."}
              </p>
              <h2 className="mt-2 font-heading text-2xl font-medium tracking-tight">
                Your governance profile
              </h2>
              <div className="mt-7 space-y-6">
                {isUnderwritingResult(result)
                  ? result.categories.map((category) => (
                      <DomainBar key={category.key} name={category.label} score={category.score} max={category.max} />
                    ))
                  : result.domains.map((domain) => (
                      <DomainBar
                        key={domain.key}
                        name={domain.label}
                        score={domain.score}
                        caption={`${domain.weight}% weight${domain.status === "PARTIAL" ? " · partial evidence" : ""}`}
                      />
                    ))}
              </div>
            </section>
            <section className="mt-7">
              <h2 className="font-heading text-2xl font-medium tracking-tight">
                A path forward.
              </h2>
              <p className="mt-2 text-sm leading-7 text-marino/70">
                Suggested improvements based on your answers. Each point gain is
                an estimate on its own, not a promised outcome.
              </p>
              {result.actionPlan.length ? (
                <ol className="mt-5 space-y-3">
                  {result.actionPlan.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-4 rounded-2xl border border-marino/8 bg-white p-5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marino font-heading text-xs text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-heading text-[16px] font-medium leading-6 tracking-tight">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-xs leading-6 text-marino/70">
                          {nextStep(item.detail)}
                        </p>
                        {/* Bank 4.0 lists every answer that lost points; where the public evidence already fills
                            the category the score gains nothing, so no badge is shown. */}
                        {item.pointsGain > 0 && (
                          <span className="mt-3 inline-flex rounded-full bg-oro/20 px-2.5 py-1 text-[10px] font-semibold text-marino">
                            Up to +{Math.round(item.pointsGain * 10) / 10} points
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 flex items-start gap-3 rounded-2xl bg-bruma/70 p-5 text-sm leading-7">
                  <CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                  No additional improvements were identified from your answers.
                  This is not an assurance that all risks are addressed.
                </p>
              )}
            </section>
            {notes.length > 0 && (
              <details className="mt-7 rounded-2xl border border-marino/10 bg-white/60 p-5 text-xs text-marino/75">
                <summary className="cursor-pointer font-semibold">
                  Notes for review ({notes.length})
                </summary>
                <ul className="mt-3 space-y-2">
                  {notes.map((note) => (
                    <li key={note} className="leading-5">
                      {note}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {/* The webapp exists in the debug modes, simulated by default, and in production once NEXT_PUBLIC_WEBAPP_ENABLED
                says the back is on with the real accounts; until then the back answers 501 there (DN-13 §7.6, §8.1). Literal
                comparisons, as DN-09 asks. */}
            {(process.env.NEXT_PUBLIC_ARCA_MODE === "mock" || process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug" ||
              process.env.NEXT_PUBLIC_WEBAPP_ENABLED === "true") &&
              scanId && <SaveResultsCta scanId={scanId} result={result} />}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-marino/10 pt-5">
              <span className="text-[10px] leading-5 text-marino/70">
                Completed {completedOn(result.completedAt)}
                <br />
                {isUnderwritingResult(result)
                  ? versionLine(result.bankVersion, result.configVersion)
                  : versionLine(result.bankVersion, result.scoringVersion)}
              </span>
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-full border border-marino/20 px-4 py-2.5 text-xs font-semibold text-marino hover:bg-white"
              >
                New scan
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )
      )}
    </AssessmentShell>
  );
}

export default function AssessmentResultsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-canvas"
          role="status"
          aria-label="Loading assessment result"
        />
      }
    >
      <ResultsScreen />
    </Suspense>
  );
}
