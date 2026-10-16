"use client";

import { Check, ExternalLink, Info, Minus, Plus, Sparkles } from "lucide-react";
import type { AnswerValue, RenderedQuestion } from "@arca/contracts";
import DomainIndicator from "./DomainIndicator";
import { answerLabel, safeEvidenceUrl, toggleOption } from "@/lib/assessment";

export default function QuestionCard({
  question,
  answer,
  onAnswer,
  disabled = false,
}: {
  question: RenderedQuestion;
  answer: AnswerValue | undefined;
  onAnswer: (answer: AnswerValue | undefined) => void;
  disabled?: boolean;
}) {
  const isMulti = question.type === "multi_select";
  const selected =
    answer?.kind === "option"
      ? [answer.optionId]
      : answer?.kind === "options"
        ? answer.optionIds
        : [];
  const numeric =
    answer?.kind === "scale" || answer?.kind === "number"
      ? answer.value
      : undefined;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <DomainIndicator
          domain={question.domain}
          domain_label={question.domainLabel}
        />
        {!question.scored && (
          <span className="text-[11px] text-marino/70">
            Context only · does not affect your score
          </span>
        )}
      </div>
      <h2
        id="question-heading"
        tabIndex={-1}
        className="mt-6 font-heading text-[25px] font-medium leading-snug tracking-[-0.035em] text-marino outline-none sm:text-[28px]"
      >
        {question.text}
      </h2>
      {question.help && (
        <p id="question-help" className="mt-3 text-sm leading-6 text-marino/70">
          {question.help}
        </p>
      )}
      {question.context && (
        <div className="mt-5 rounded-2xl bg-bruma/65 px-4 py-3.5">
          <p className="flex items-start gap-2 text-sm leading-6 text-marino">
            <Sparkles
              aria-hidden
              className="mt-1 h-4 w-4 shrink-0 text-cielo"
            />
            {question.context}
          </p>
        </div>
      )}
      {question.evidence.length > 0 && (
        <details className="mt-3 text-xs text-marino/70">
          <summary className="cursor-pointer rounded py-1 focus-visible:outline-2 focus-visible:outline-marino">
            Evidence from your quick scan ({question.evidence.length})
          </summary>
          <ul className="mt-2 space-y-2 border-l-2 border-cielo/40 pl-3">
            {question.evidence.map((evidence) => {
              const url = safeEvidenceUrl(evidence.sourceUrl);
              return (
                <li key={evidence.id} className="leading-5">
                  <p>{evidence.text}</p>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                    >
                      View source
                      <ExternalLink aria-hidden className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-marino/70">
                      Recorded scan signal · no source link
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {question.suggestedAnswer && !answer && (
        <div className="mt-5 rounded-2xl border border-cielo/35 bg-cielo/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-marino">
            <Info aria-hidden className="h-3.5 w-3.5" />A suggestion to review
          </p>
          <p className="mt-2 text-sm leading-6 text-marino">
            {answerLabel(question, question.suggestedAnswer)}
          </p>
          <p className="mt-1 text-xs leading-5 text-marino/70">
            Public evidence may be incomplete. Confirm this yourself, or choose
            a different answer below.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(question.suggestedAnswer!)}
            className="mt-3 rounded-full border border-marino/20 px-4 py-2 text-xs font-semibold text-marino hover:bg-bruma focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino disabled:opacity-50"
          >
            Use this answer
          </button>
        </div>
      )}
      <fieldset
        disabled={disabled}
        aria-describedby={question.help ? "question-help" : undefined}
        className="mt-7 disabled:opacity-70"
      >
        <legend className="sr-only">{question.text}</legend>
        {question.options && (
          <div className="space-y-2.5">
            {isMulti && (
              <p className="mb-3 text-xs text-marino/70">
                Select all that apply.
              </p>
            )}
            {question.options.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`group flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-colors motion-reduce:transition-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marino ${isSelected ? "border-marino bg-marino/[0.035]" : "border-marino/12 bg-white hover:border-cielo"}`}
                >
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name={question.id}
                    value={option.id}
                    checked={isSelected}
                    onChange={() =>
                      onAnswer(
                        isMulti
                          ? toggleOption(question, answer, option.id)
                          : { kind: "option", optionId: option.id },
                      )
                    }
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border ${isMulti ? "rounded-md" : "rounded-full"} ${isSelected ? "border-marino bg-marino" : "border-marino/30 bg-white"}`}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </span>
                  <span className="text-[14px] leading-6 text-marino">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {question.type === "scale" && question.scale && (
          <div className="rounded-2xl border border-marino/10 bg-bruma/25 p-5">
            <p
              aria-live="polite"
              className="text-center font-heading text-xl font-medium text-marino"
            >
              {answer ? answerLabel(question, answer) : "Choose a value"}
            </p>
            <input
              aria-label={question.text}
              aria-valuetext={
                answer ? answerLabel(question, answer) : "No answer selected"
              }
              type="range"
              min={question.scale.min}
              max={question.scale.max}
              step={question.scale.step}
              value={numeric ?? question.scale.min}
              onChange={(event) =>
                onAnswer({ kind: "scale", value: Number(event.target.value) })
              }
              className="mt-7 h-2 w-full cursor-pointer accent-marino"
            />
            <div className="mt-4 flex justify-between gap-4 text-xs text-marino/75">
              <span>{question.scale.minLabel}</span>
              <span className="text-right">{question.scale.maxLabel}</span>
            </div>
            <div
              className="mt-5 flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Select an exact value"
            >
              {Array.from(
                {
                  length: Math.min(
                    21,
                    Math.floor(
                      (question.scale.max - question.scale.min) /
                        question.scale.step,
                    ) + 1,
                  ),
                },
                (_, index) =>
                  question.scale!.min + index * question.scale!.step,
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={numeric === value}
                  aria-label={
                    value === question.scale!.min
                      ? `${value}: ${question.scale!.minLabel}`
                      : value === question.scale!.max
                        ? `${value}: ${question.scale!.maxLabel}`
                        : String(value)
                  }
                  onClick={() => onAnswer({ kind: "scale", value })}
                  className={`h-10 min-w-10 rounded-xl border px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino ${numeric === value ? "border-marino bg-marino text-white" : "border-marino/15 bg-white text-marino"}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
        {question.type === "number" && question.number && (
          <div className="rounded-2xl border border-marino/10 bg-bruma/25 p-5">
            <label
              htmlFor="number-answer"
              className="mb-4 block text-sm text-marino/75"
            >
              {question.number.unit} · {question.number.min}–
              {question.number.max}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease value"
                disabled={
                  numeric === undefined || numeric <= question.number.min
                }
                onClick={() =>
                  onAnswer({
                    kind: "number",
                    value: Math.max(
                      question.number!.min,
                      (numeric ?? question.number!.min) - 1,
                    ),
                  })
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-marino/15 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino disabled:opacity-30"
              >
                <Minus aria-hidden className="h-4 w-4" />
              </button>
              <input
                id="number-answer"
                type="number"
                inputMode="numeric"
                min={question.number.min}
                max={question.number.max}
                step="1"
                value={numeric ?? ""}
                placeholder="Enter a number"
                onChange={(event) =>
                  onAnswer(
                    event.target.value === ""
                      ? undefined
                      : { kind: "number", value: Number(event.target.value) },
                  )
                }
                className="h-14 min-w-0 w-full rounded-xl border border-marino/15 bg-white px-3 text-center font-heading text-xl text-marino focus:border-marino focus:outline-2 focus:outline-offset-2 focus:outline-marino"
              />
              <button
                type="button"
                aria-label="Increase value"
                disabled={
                  numeric !== undefined && numeric >= question.number.max
                }
                onClick={() =>
                  onAnswer({
                    kind: "number",
                    value: Math.min(
                      question.number!.max,
                      numeric === undefined
                        ? question.number!.min
                        : numeric + 1,
                    ),
                  })
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-marino/15 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marino disabled:opacity-30"
              >
                <Plus aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
