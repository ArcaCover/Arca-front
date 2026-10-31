import type { AnswerValue, AssessmentView, RenderedQuestion } from "@arca/contracts";

import { getAssessment, saveAnswer } from "@/lib/api/client";

// The panel's "Auto-answer" (DN-09 §6.4). It goes through the normal API, one PUT per question, so the server's branch
// rules decide which follow-ups appear, exactly as they do for a person answering.
const MAX_ANSWERS = 50;

const unanswerable = (question: RenderedQuestion) =>
  new Error(`Question ${question.id} (${question.type}) has nothing to choose from`);

/** The question's suggested answer, or else the first valid one for its type. */
export function chooseAnswer(question: RenderedQuestion): AnswerValue {
  if (question.suggestedAnswer) return question.suggestedAnswer;
  switch (question.type) {
    case "single_select":
    case "yes_no": {
      const first = question.options?.[0];
      if (!first) throw unanswerable(question);
      return { kind: "option", optionId: first.id };
    }
    case "multi_select": {
      // An exclusive option ("None", "Not sure") must stand alone, so it is the pick only when nothing else exists.
      const pick = question.options?.find(option => !option.exclusive) ?? question.options?.[0];
      if (!pick) throw unanswerable(question);
      return { kind: "options", optionIds: [pick.id] };
    }
    case "scale":
      if (!question.scale) throw unanswerable(question);
      return { kind: "scale", value: question.scale.max };
    case "number":
      if (!question.number) throw unanswerable(question);
      return { kind: "number", value: question.number.min };
  }
}

/** Answers every visible question that has no answer, reading follow-ups from the view each save returns. */
export async function autoAnswer(
  assessmentId: string,
  token: string,
  client = { getAssessment, saveAnswer },
): Promise<AssessmentView> {
  let view = await client.getAssessment(assessmentId, token);
  for (let saved = 0; ; saved++) {
    const pending = view.questions.find(question => !view.answers[question.id]);
    if (!pending) return view;
    if (saved === MAX_ANSWERS) {
      throw new Error(`Auto-answer stopped after ${MAX_ANSWERS} answers with questions still pending`);
    }
    view = await client.saveAnswer(assessmentId, pending.id, chooseAnswer(pending), token);
  }
}
