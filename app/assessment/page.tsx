"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { AnswerValue, AssessmentView } from "@arca/contracts";
import AssessmentShell, {
  AssessmentOrb,
} from "@/components/assessment/AssessmentShell";
import QuestionCard from "@/components/assessment/QuestionCard";
import {
  ApiError,
  completeAssessment,
  getAssessment,
  saveAnswer,
  startAssessment,
} from "@/lib/api/client";
import { forgetSession, recallSession } from "@/lib/api/session";
import {
  forgetAssessment,
  recallAssessment,
  rememberAssessment,
} from "@/lib/api/assessment-session";
import { publishDebugState } from "@/lib/debug/bridge";
import {
  answerLabel,
  assessmentHref,
  firstUnanswered,
  nextQuestion,
} from "@/lib/assessment";

const PLANNING_LIMIT_MS = 45000;
const primaryButton =
  "group inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-full bg-oro py-2 pl-6 pr-2 font-heading text-sm font-medium text-marino transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marino disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 motion-reduce:transition-none";

type LoadState = "loading" | "ready" | "failed" | "expired";

function AssessmentScreen({
  scanId,
  requestedId,
}: {
  scanId: string | null;
  requestedId: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<AssessmentView | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnswerValue | undefined>();
  const [editing, setEditing] = useState(false);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const heading = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (focusNext.current) {
      heading.current?.querySelector<HTMLElement>("h2")?.focus();
      focusNext.current = false;
    }
  }, [currentId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const token = scanId ? recallSession(scanId) : null;
    if (!scanId || !token) {
      setState("expired");
      setError(
        scanId
          ? "This tab no longer has access to your scan. Sessions last up to 24 hours."
          : "Start with a quick scan so we can prepare your assessment.",
      );
      return;
    }
    const id = scanId;
    setState("loading");
    setError(null);
    async function load(assessmentId?: string) {
      try {
        let activeId = assessmentId ?? requestedId ?? recallAssessment(id);
        if (!activeId) {
          const started = await startAssessment(id, token!);
          activeId = started.assessmentId;
          rememberAssessment(id, activeId);
        }
        if (cancelled) return;
        const next = await getAssessment(activeId, token!);
        if (cancelled) return;
        if (next.scanId !== id)
          throw new ApiError(
            "unauthorized",
            "This assessment does not belong to this scan.",
          );
        publishDebugState("assessment", {
          assessmentId: next.assessmentId,
          status: next.status,
          planner: next.planner,
          bankVersion: next.bankVersion,
          expiresAt: next.expiresAt,
          progress: next.progress,
          // How long this load has waited for the assessment, PLANNING polls included.
          planningMs: Date.now() - startedAt,
        });
        rememberAssessment(id, activeId, next.expiresAt);
        setView(next);
        if (next.status === "EXPIRED")
          throw new ApiError("expired", "This assessment session has expired.");
        if (next.status === "FAILED")
          throw new ApiError(
            "planning_failed",
            "We could not prepare your assessment. Try again, or return to your pre-score.",
          );
        if (next.status === "COMPLETED") {
          router.replace(assessmentHref(id, activeId, true));
          return;
        }
        if (next.status === "PLANNING") {
          if (Date.now() - startedAt >= PLANNING_LIMIT_MS)
            throw new ApiError(
              "not_ready",
              "This is taking longer than usual. Your scan is safe. Try checking again.",
            );
          timer = setTimeout(() => void load(activeId), 1200);
          return;
        }
        const first = firstUnanswered(next);
        setCurrentId(first);
        setDraft(first ? next.answers[first] : undefined);
        setState("ready");
        // Only opaque IDs travel in the URL. Saved answers remain on the server.
        if (!requestedId)
          window.history.replaceState(null, "", assessmentHref(id, activeId));
      } catch (cause) {
        if (cancelled) return;
        const code = cause instanceof ApiError ? cause.code : null;
        if (code === "unauthorized" || code === "expired") {
          forgetSession(id);
          forgetAssessment(id);
          setState("expired");
        } else {
          setState("failed");
        }
        setError(
          cause instanceof ApiError
            ? cause.message
            : "We could not load your assessment. Please try again.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scanId, requestedId, attempt, router]);

  function showQuestion(
    id: string | null,
    nextView = view,
    fromReview = false,
  ) {
    focusNext.current = true;
    setCurrentId(id);
    setDraft(id ? nextView?.answers[id] : undefined);
    setEditing(fromReview);
    setError(null);
    setAttested(false);
  }

  function expire() {
    if (scanId) {
      forgetSession(scanId);
      forgetAssessment(scanId);
    }
    setState("expired");
    setError("Your session has expired. Start a new scan to continue.");
  }

  async function continueAnswer() {
    if (!view || !currentId || !draft || inFlight.current) return;
    const token = scanId ? recallSession(scanId) : null;
    if (!token) {
      expire();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const next = await saveAnswer(view.assessmentId, currentId, draft, token);
      if (!alive.current) return;
      setView(next);
      showQuestion(nextQuestion(next, currentId, editing), next, editing);
    } catch (cause) {
      if (!alive.current) return;
      if (
        cause instanceof ApiError &&
        (cause.code === "unauthorized" || cause.code === "expired")
      ) {
        expire();
        return;
      }
      if (cause instanceof ApiError && cause.code === "already_completed") {
        router.replace(assessmentHref(scanId!, view.assessmentId, true));
        return;
      }
      if (
        cause instanceof ApiError &&
        (cause.code === "not_visible" || cause.code === "conflict")
      ) {
        setAttempt((value) => value + 1);
        return;
      }
      setError(
        cause instanceof ApiError && cause.code === "invalid_answer"
          ? cause.message
          : "We couldn’t save that answer. It is still selected below. Please try again.",
      );
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function complete() {
    if (!view || !scanId || !attested || inFlight.current) return;
    const token = recallSession(scanId);
    if (!token) {
      expire();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await completeAssessment(view.assessmentId, token);
      if (alive.current)
        router.replace(assessmentHref(scanId, view.assessmentId, true));
    } catch (cause) {
      if (!alive.current) return;
      if (
        cause instanceof ApiError &&
        (cause.code === "unauthorized" || cause.code === "expired")
      ) {
        expire();
        return;
      }
      if (cause instanceof ApiError && cause.code === "already_completed") {
        router.replace(assessmentHref(scanId, view.assessmentId, true));
        return;
      }
      if (cause instanceof ApiError && cause.code === "incomplete") {
        setAttested(false);
        setAttempt((value) => value + 1);
        return;
      }
      setError(
        "We couldn’t confirm completion. Your saved answers are safe. Try again; the same assessment will only be completed once.",
      );
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const question = view?.questions.find((item) => item.id === currentId);
  const index =
    view?.questions.findIndex((item) => item.id === currentId) ?? -1;
  const numericValid =
    !question ||
    !draft ||
    (draft.kind !== "number" && draft.kind !== "scale") ||
    (Number.isFinite(draft.value) &&
      (draft.kind !== "number" || Number.isInteger(draft.value)) &&
      draft.value >= (question.number?.min ?? question.scale?.min ?? 0) &&
      draft.value <= (question.number?.max ?? question.scale?.max ?? Infinity));

  return (
    <AssessmentShell
      scanId={scanId}
      view={view}
      description={view?.intro || undefined}
    >
      {state === "loading" && (
        <section className="flex min-h-[410px] flex-col items-center justify-center rounded-[28px] border border-white bg-white/80 p-8 text-center shadow-sm">
          <AssessmentOrb loading />
          <h2 className="mt-7 font-heading text-2xl font-medium tracking-tight text-marino">
            Making this yours.
          </h2>
          <p
            role="status"
            className="mt-3 max-w-sm text-sm leading-7 text-marino/70"
          >
            We’re preparing your questions across six areas of AI governance.
            Every answer stays yours to confirm.
          </p>
          <p className="mt-5 flex items-center gap-2 text-xs text-marino/70">
            <Loader2
              aria-hidden
              className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            />
            Preparing assessment
          </p>
          {scanId && (
            <Link
              href={`/score?scan=${encodeURIComponent(scanId)}`}
              className="mt-7 text-xs underline underline-offset-4"
            >
              Back to pre-score
            </Link>
          )}
        </section>
      )}
      {(state === "failed" || state === "expired") && (
        <section className="rounded-[28px] border border-marino/10 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="font-heading text-2xl font-medium tracking-tight">
            {state === "expired"
              ? "Let’s reconnect your session."
              : "A small pause along the way."}
          </h2>
          <p role="alert" className="mt-4 text-sm leading-7 text-marino/75">
            {error}
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            {state === "failed" && (
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-oro px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                Try again
              </button>
            )}
            <Link
              href={
                state === "expired"
                  ? "/quote"
                  : `/score?scan=${encodeURIComponent(scanId ?? "")}`
              }
              className="rounded-full border border-marino/15 px-5 py-3 text-sm font-semibold"
            >
              {state === "expired" ? "Start a new scan" : "Back to pre-score"}
            </Link>
          </div>
        </section>
      )}
      {state === "ready" && view && (
        <>
          <div className="mb-5 rounded-2xl border border-marino/8 bg-white/60 px-5 py-4">
            <div className="flex items-center justify-between gap-3 text-xs text-marino/75">
              <span>
                {currentId
                  ? `Question ${index + 1} of ${view.progress.total}`
                  : "Ready for your review"}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <CheckCircle2
                  aria-hidden
                  className="h-3.5 w-3.5 text-marino/70"
                />
                {view.progress.answered} saved
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Saved answers"
              aria-valuemin={0}
              aria-valuemax={view.progress.total}
              aria-valuenow={view.progress.answered}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-bruma"
            >
              <div
                className="h-full rounded-full bg-marino transition-[width] duration-300 motion-reduce:transition-none"
                style={{
                  width: `${view.progress.total ? (view.progress.answered / view.progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div
            ref={heading}
            className="rounded-[28px] border border-marino/8 bg-white p-6 shadow-[0_12px_50px_-30px_color-mix(in_srgb,var(--color-marino)_25%,transparent)] sm:p-8"
          >
            {question ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void continueAnswer();
                }}
              >
                <div
                  key={question.id}
                  className="animate-fade-up [animation-duration:200ms]"
                >
                  <QuestionCard
                    question={question}
                    answer={draft}
                    onAnswer={setDraft}
                    disabled={busy}
                  />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-rojo/5 px-4 py-3 text-sm leading-6 text-rojo"
                  >
                    {error}
                  </p>
                )}
                <div className="mt-8 flex items-center justify-between gap-3 border-t border-marino/10 pt-6">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      editing
                        ? showQuestion(null)
                        : index > 0
                          ? showQuestion(view.questions[index - 1].id)
                          : router.push(
                              `/score?scan=${encodeURIComponent(scanId!)}`,
                            )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm text-marino/70 hover:text-marino focus-visible:outline-2 focus-visible:outline-marino disabled:opacity-40"
                  >
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                    {editing ? "Review" : "Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={!draft || !numericValid || busy}
                    className={primaryButton}
                  >
                    {busy ? "Saving…" : editing ? "Save change" : "Continue"}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                      {busy ? (
                        <Loader2
                          aria-hidden
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </div>
                <p
                  role="status"
                  className="mt-4 text-center text-[11px] text-marino/70"
                >
                  {busy
                    ? "Saving your answer securely…"
                    : "Your answer is saved when you continue."}
                </p>
              </form>
            ) : (
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-bruma px-3 py-1.5 text-xs font-semibold">
                  <Check aria-hidden className="h-3.5 w-3.5" />
                  The full picture
                </span>
                <h2
                  tabIndex={-1}
                  className="mt-5 font-heading text-[28px] font-medium tracking-tight outline-none"
                >
                  One last look.
                </h2>
                <p className="mt-2 text-sm leading-6 text-marino/70">
                  Review your answers before we calculate your demo score. You
                  can still change anything.
                </p>
                <ol className="mt-6 divide-y divide-marino/10">
                  {view.questions.map((item, itemIndex) => (
                    <li key={item.id} className="flex items-start gap-3 py-4">
                      <span className="mt-1 text-[10px] tabular-nums text-marino/70">
                        {String(itemIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-5 text-marino/70">
                          {item.text}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-marino">
                          {answerLabel(item, view.answers[item.id])}
                        </p>
                        {!item.scored && (
                          <span className="text-[10px] text-marino/70">
                            Context only
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Edit answer: ${item.text}`}
                        onClick={() => showQuestion(item.id, view, true)}
                        className="mt-1 rounded-full p-2 text-marino/70 hover:bg-bruma focus-visible:outline-2 focus-visible:outline-marino disabled:opacity-40"
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-marino/15 bg-bruma/30 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marino">
                  <input
                    type="checkbox"
                    checked={attested}
                    disabled={busy}
                    onChange={(event) => setAttested(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-marino"
                  />
                  <span className="text-xs leading-6 text-marino">
                    I confirm these answers are accurate to the best of my
                    knowledge. I understand this uses provisional demo rules and
                    is not an insurance application or coverage decision.
                  </span>
                </label>
                {error && (
                  <p role="alert" className="mt-5 text-sm leading-6 text-rojo">
                    {error}
                  </p>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!attested || busy || !!firstUnanswered(view)}
                    onClick={() => void complete()}
                    className={primaryButton}
                  >
                    {busy ? "Calculating…" : "See my demo score"}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                      {busy ? (
                        <Loader2
                          aria-hidden
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-[10px] text-marino/70">
            Demo question bank {view.bankVersion} ·{" "}
            {view.questions.filter((item) => item.scored).length} scored
            questions · Follow-ups add context
          </p>
        </>
      )}
    </AssessmentShell>
  );
}

function AssessmentRoute() {
  const params = useSearchParams();
  const scanId = params.get("scan");
  const requestedId = params.get("a");
  return (
    <AssessmentScreen
      key={`${scanId}:${requestedId}`}
      scanId={scanId}
      requestedId={requestedId}
    />
  );
}

export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-canvas"
          role="status"
          aria-label="Loading assessment"
        />
      }
    >
      <AssessmentRoute />
    </Suspense>
  );
}
