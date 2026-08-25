"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

import { ArcaWordmark } from "@/components/brand/ArcaWordmark";
import { NavigationButtons, ProgressBar, QuestionCard } from "@/components/assessment";
import { MOCK_ASSESSMENT_QUESTIONS } from "@/lib/mock/assessment-questions";
import type { AssessmentResponse } from "@/lib/types/assessment";

type Answer = AssessmentResponse["answer"];

// TODO: replace timer with a real POST to /assessment/{scan_id}/submit.
// The pause stands in for the round trip that will score the answers.
const SUBMIT_MS = 1500;

function AssessmentScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email");
  const domain = params.get("domain");
  const query = params.toString();

  // TODO: replace with API call to GET /assessment/{scan_id}/questions
  const { questions } = MOCK_ASSESSMENT_QUESTIONS;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);

  // Answers live in memory only. Reloading the page starts the questionnaire
  // over, which is the honest behaviour until the backend can hold a draft.
  const question = questions[index];
  const answer = answers[question.id];
  const canProceed = Array.isArray(answer) ? answer.length > 0 : answer !== undefined;

  const isLast = index === questions.length - 1;

  // Landing here without the form's answers means there is no firm to assess.
  // Replace rather than push, so Back does not bounce into a dead URL.
  const incomplete = !email || !domain;
  useEffect(() => {
    if (incomplete) router.replace("/quote");
  }, [incomplete, router]);

  function handleAnswer(questionId: string, value: Answer) {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  }

  function handleNext() {
    if (!isLast) {
      setIndex((current) => current + 1);
      return;
    }

    setSubmitting(true);
    setTimeout(() => router.push(`/assessment/results?${query}`), SUBMIT_MS);
  }

  if (incomplete) return null;

  if (submitting) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center">
          <Loader2 aria-hidden className="h-8 w-8 animate-spin text-cielo" />
          <p aria-live="polite" className="mt-6 font-heading text-lg text-marino">
            Scoring your answers...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[720px] px-6 py-10 sm:px-8 lg:py-14">
        <header>
          <ArcaWordmark className="h-7 w-auto text-marino" />
        </header>

        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-marino/50 md:justify-start">
          <Info aria-hidden className="h-4 w-4 shrink-0" />
          This is an illustrative example — not a real assessment.
        </p>

        <div className="mt-10">
          <ProgressBar current={index + 1} total={questions.length} />
        </div>

        {/* Keyed on the question so the entrance replays on every step. The
            house animation runs at 0.7s, which reads as lag when you step it
            ten times, so only the duration is overridden — keeping the class
            keeps the reduced-motion rule in globals.css. */}
        <div key={question.id} className="mt-8 animate-fade-up [animation-duration:280ms]">
          <QuestionCard question={question} answer={answer} onAnswer={handleAnswer} />
        </div>

        <div className="mt-8">
          <NavigationButtons
            onPrevious={() => setIndex((current) => Math.max(0, current - 1))}
            onNext={handleNext}
            isFirst={index === 0}
            isLast={isLast}
            canProceed={canProceed}
          />
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  // useSearchParams needs a boundary above it or the route cannot be
  // prerendered.
  return (
    <Suspense fallback={null}>
      <AssessmentScreen />
    </Suspense>
  );
}
