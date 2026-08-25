"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";

import DomainIndicator from "./DomainIndicator";
import type { AssessmentQuestion, AssessmentResponse } from "@/lib/types/assessment";

type Answer = AssessmentResponse["answer"];

// Hover for a mouse, focus for a keyboard, click for touch: the tooltip has to
// answer to all three or it is decoration for some readers.
function InfoTooltip({ id, text }: { id: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Why we ask this"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-pointer text-marino/40 transition-colors hover:text-cielo focus-visible:text-cielo focus-visible:outline-none"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      {/* Anchored to the right edge: the trigger sits at the end of the
          heading, and a centred bubble hangs off the side of the card. */}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-7 z-10 w-72 rounded-xl bg-marino px-4 py-3 text-xs leading-relaxed text-white shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export default function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: AssessmentQuestion;
  answer: Answer | undefined;
  onAnswer: (questionId: string, answer: Answer) => void;
}) {
  const isMulti = question.type === "multi_select";

  // One shape to render from, whatever the question type stores.
  const selected =
    answer === undefined ? [] : Array.isArray(answer) ? answer : [answer];

  function handleSelect(optionId: string) {
    if (!isMulti) {
      onAnswer(question.id, optionId);
      return;
    }

    onAnswer(
      question.id,
      selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId],
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10">
      <DomainIndicator domain={question.domain} domain_label={question.domain_label} />

      <div className="mt-5 flex items-start gap-2">
        <h2 className="font-heading text-2xl font-medium tracking-tight text-marino">
          {question.text}
        </h2>
        {question.info_tooltip ? (
          <span className="mt-1.5">
            <InfoTooltip id={`${question.id}-tooltip`} text={question.info_tooltip} />
          </span>
        ) : null}
      </div>

      {question.context ? (
        <p className="mt-4 rounded-xl bg-bruma px-4 py-3 text-sm leading-relaxed text-marino/70">
          {question.context}
        </p>
      ) : null}

      <fieldset className="mt-7">
        <legend className="sr-only">{question.text}</legend>
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = selected.includes(option.id);

            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors has-[:focus-visible]:border-cielo ${
                  isSelected ? "border-cielo bg-cielo/10" : "border-bruma hover:border-cielo/50"
                }`}
              >
                {/* The native control stays in the tree for keyboard and screen
                    readers; only its rendering is ours. */}
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={question.id}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => handleSelect(option.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors ${
                    isMulti ? "rounded-md" : "rounded-full"
                  } ${isSelected ? "border-cielo bg-cielo" : "border-marino/25"}`}
                >
                  {isSelected ? (
                    isMulti ? (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )
                  ) : null}
                </span>
                <span className="text-marino">{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {question.skipped_question && question.skip_reason ? (
        <p className="mt-6 text-xs leading-relaxed text-marino/45">
          Skipped for you: {question.skipped_question} — {question.skip_reason}
        </p>
      ) : null}
    </div>
  );
}
