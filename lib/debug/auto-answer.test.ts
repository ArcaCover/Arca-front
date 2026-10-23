import type { AnswerValue, AssessmentView, RenderedQuestion } from "@arca/contracts";
import { describe, expect, it, vi } from "vitest";

import { fixtureAssessment, fixtureQuestion } from "@/lib/test-fixtures/assessment";
import { autoAnswer, chooseAnswer } from "./auto-answer";

const yesNo = [
  { id: "yes", label: "Yes", exclusive: false },
  { id: "no", label: "Not yet", exclusive: false },
];
const scale = (overrides: Partial<RenderedQuestion> = {}) =>
  fixtureQuestion({ type: "scale", options: null, scale: { min: 1, max: 5, step: 1, minLabel: "Never", maxLabel: "Always" }, ...overrides });

describe("chooseAnswer", () => {
  it("takes the question's suggested answer when it has one", () => {
    const suggested: AnswerValue = { kind: "option", optionId: "no" };

    expect(chooseAnswer(fixtureQuestion({ suggestedAnswer: suggested }))).toEqual(suggested);
  });

  it("picks the first option of a single select", () => {
    expect(chooseAnswer(fixtureQuestion())).toEqual({ kind: "option", optionId: "yes" });
  });

  it("picks the first option of a yes/no question", () => {
    expect(chooseAnswer(fixtureQuestion({ type: "yes_no", options: yesNo }))).toEqual({ kind: "option", optionId: "yes" });
  });

  it("picks the first non-exclusive option of a multi select, alone", () => {
    const question = fixtureQuestion({
      type: "multi_select",
      options: [
        { id: "none", label: "None", exclusive: true },
        { id: "chatgpt", label: "ChatGPT", exclusive: false },
        { id: "copilot", label: "Copilot", exclusive: false },
      ],
    });

    expect(chooseAnswer(question)).toEqual({ kind: "options", optionIds: ["chatgpt"] });
  });

  it("picks the first exclusive option alone when a multi select has only exclusive options", () => {
    const question = fixtureQuestion({
      type: "multi_select",
      options: [
        { id: "unknown", label: "Not sure", exclusive: true },
        { id: "none", label: "None", exclusive: true },
      ],
    });

    expect(chooseAnswer(question)).toEqual({ kind: "options", optionIds: ["unknown"] });
  });

  it("answers a scale with its maximum", () => {
    expect(chooseAnswer(scale())).toEqual({ kind: "scale", value: 5 });
  });

  it("answers a number with its minimum", () => {
    const question = fixtureQuestion({ type: "number", options: null, number: { min: 2, max: 50, unit: "lawyers" } });

    expect(chooseAnswer(question)).toEqual({ kind: "number", value: 2 });
  });

  it("refuses a question that lacks what its type needs", () => {
    expect(() => chooseAnswer(fixtureQuestion({ type: "single_select", options: null }))).toThrow(/governance\.policy/);
  });
});

describe("autoAnswer", () => {
  // A stand-in for the API: answering q1 reveals the follow-up q1a right after it, as the real branch rules do.
  function fakeApi() {
    const q1 = fixtureQuestion({ id: "q1" });
    const q1a = fixtureQuestion({ id: "q1a", type: "yes_no", options: yesNo });
    const q2 = scale({ id: "q2" });
    let answers: Record<string, AnswerValue> = {};
    const view = (): AssessmentView => {
      const questions = answers.q1 ? [q1, q1a, q2] : [q1, q2];
      return fixtureAssessment({
        status: "IN_PROGRESS",
        questions,
        answers: { ...answers },
        progress: { answered: Object.keys(answers).length, total: questions.length },
      });
    };
    return {
      getAssessment: vi.fn(async (_assessmentId: string, _token: string) => view()),
      saveAnswer: vi.fn(async (_assessmentId: string, questionId: string, answer: AnswerValue, _token: string) => {
        answers = { ...answers, [questionId]: answer };
        return view();
      }),
    };
  }

  it("answers every pending question, follows up on what each save reveals, and returns the final view", async () => {
    const api = fakeApi();
    const first = await api.getAssessment("as_demo", "token-1");
    expect(first.questions.filter(question => !first.answers[question.id])).toHaveLength(2);
    api.getAssessment.mockClear();

    const final = await autoAnswer("as_demo", "token-1", api);

    expect(api.getAssessment).toHaveBeenCalledExactlyOnceWith("as_demo", "token-1");
    expect(api.saveAnswer.mock.calls).toEqual([
      ["as_demo", "q1", { kind: "option", optionId: "yes" }, "token-1"],
      ["as_demo", "q1a", { kind: "option", optionId: "yes" }, "token-1"],
      ["as_demo", "q2", { kind: "scale", value: 5 }, "token-1"],
    ]);
    expect(final.progress).toEqual({ answered: 3, total: 3 });
    expect(final).toBe(await api.saveAnswer.mock.results[2].value);
  });

  it("stops with an error after 50 answers when questions are still pending", async () => {
    const stuck = fixtureAssessment();
    const api = { getAssessment: vi.fn(async () => stuck), saveAnswer: vi.fn(async () => stuck) };

    await expect(autoAnswer("as_demo", "token-1", api)).rejects.toThrow(/50/);
    expect(api.saveAnswer).toHaveBeenCalledTimes(50);
  });
});
