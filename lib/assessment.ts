import type {
  AnswerValue,
  AssessmentView,
  RenderedQuestion,
} from "@arca/contracts";

/** Presentation helpers only. Eligibility and score rules stay in the API. */
export function answerLabel(
  question: RenderedQuestion,
  answer?: AnswerValue,
): string {
  if (!answer) return "Not answered";
  if (answer.kind === "option")
    return (
      question.options?.find((option) => option.id === answer.optionId)
        ?.label ?? answer.optionId
    );
  if (answer.kind === "options")
    return answer.optionIds
      .map(
        (id) =>
          question.options?.find((option) => option.id === id)?.label ?? id,
      )
      .join(", ");
  if (answer.kind === "number")
    return `${answer.value} ${question.number?.unit ?? ""}`.trim();
  if (answer.value === question.scale?.min)
    return `${answer.value} · ${question.scale.minLabel}`;
  if (answer.value === question.scale?.max)
    return `${answer.value} · ${question.scale.maxLabel}`;
  return String(answer.value);
}

export function toggleOption(
  question: RenderedQuestion,
  answer: AnswerValue | undefined,
  optionId: string,
): AnswerValue | undefined {
  const selected = answer?.kind === "options" ? answer.optionIds : [];
  const option = question.options?.find((item) => item.id === optionId);
  if (!option) return answer;
  const next = selected.includes(optionId)
    ? selected.filter((id) => id !== optionId)
    : option.exclusive
      ? [optionId]
      : [
          ...selected.filter(
            (id) =>
              !question.options?.find((item) => item.id === id)?.exclusive,
          ),
          optionId,
        ];
  return next.length ? { kind: "options", optionIds: next } : undefined;
}

export function firstUnanswered(view: AssessmentView): string | null {
  return (
    view.questions.find((question) => !view.answers[question.id])?.id ?? null
  );
}

export function nextQuestion(
  view: AssessmentView,
  currentId: string,
  reviewing: boolean,
): string | null {
  // A changed answer can introduce an unanswered follow-up, even when editing in review.
  if (reviewing) return firstUnanswered(view);
  const index = view.questions.findIndex(
    (question) => question.id === currentId,
  );
  return view.questions[index + 1]?.id ?? firstUnanswered(view);
}

export function safeEvidenceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function assessmentHref(
  scanId: string,
  assessmentId: string,
  results = false,
): string {
  return `/assessment${results ? "/results" : ""}?scan=${encodeURIComponent(scanId)}&a=${encodeURIComponent(assessmentId)}`;
}
