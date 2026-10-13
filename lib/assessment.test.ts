import { describe, expect, it } from "vitest";
import type { AnswerValue } from "@arca/contracts";

import { answerLabel, assessmentHref, firstUnanswered, nextQuestion, safeEvidenceUrl, toggleOption } from "@/lib/assessment";
import { fixtureAssessment, fixtureQuestion } from "@/lib/test-fixtures/assessment";

describe("answerLabel", () => {
  it("distinguishes unanswered questions from suggestions", () => {
    expect(answerLabel(fixtureQuestion({ suggestedAnswer: { kind: "option", optionId: "yes" } }))).toBe("Not answered");
  });

  it.each(["single_select", "yes_no"] as const)("uses the server labels for %s", type => {
    const question = fixtureQuestion({ type });
    expect(answerLabel(question, { kind: "option", optionId: "yes" })).toBe("Yes");
    expect(answerLabel(question, { kind: "option", optionId: "unlisted" })).toBe("unlisted");
  });

  it("preserves multi-select order and falls back to unknown IDs", () => {
    const question = fixtureQuestion({ type: "multi_select" });
    expect(answerLabel(question, { kind: "options", optionIds: ["no", "yes", "unlisted"] })).toBe("No, Yes, unlisted");
    expect(answerLabel(fixtureQuestion({ options: null }), { kind: "option", optionId: "yes" })).toBe("yes");
  });

  it("formats zero and numeric answers with the server's unit", () => {
    const question = fixtureQuestion({ type: "number", number: { min: 0, max: 100, unit: "employees" } });
    expect(answerLabel(question, { kind: "number", value: 0 })).toBe("0 employees");
    expect(answerLabel(question, { kind: "number", value: 12.5 })).toBe("12.5 employees");
    expect(answerLabel(fixtureQuestion({ type: "number" }), { kind: "number", value: 12 })).toBe("12");
  });

  it.each([[0, "0 · Never"], [3, "3"], [5, "5 · Always"]] as const)("formats scale value %s", (value, label) => {
    const question = fixtureQuestion({ type: "scale", scale: { min: 0, max: 5, step: 1, minLabel: "Never", maxLabel: "Always" } });
    expect(answerLabel(question, { kind: "scale", value })).toBe(label);
  });
});

describe("toggleOption", () => {
  const question = fixtureQuestion({ type: "multi_select" });

  it("adds and removes ordinary options without mutating the saved answer", () => {
    const answer: AnswerValue = { kind: "options", optionIds: ["yes"] };
    expect(toggleOption(question, undefined, "yes")).toEqual(answer);
    expect(toggleOption(question, answer, "no")).toEqual({ kind: "options", optionIds: ["yes", "no"] });
    expect(answer.optionIds).toEqual(["yes"]);
    expect(toggleOption(question, answer, "yes")).toBeUndefined();
  });

  it("replaces all other selections with an exclusive option", () => {
    expect(toggleOption(question, { kind: "options", optionIds: ["yes", "no"] }, "unknown"))
      .toEqual({ kind: "options", optionIds: ["unknown"] });
  });

  it("removes exclusive options when selecting an ordinary one", () => {
    expect(toggleOption(question, { kind: "options", optionIds: ["unknown"] }, "yes"))
      .toEqual({ kind: "options", optionIds: ["yes"] });
    expect(toggleOption(question, { kind: "options", optionIds: ["unknown"] }, "unknown")).toBeUndefined();
  });

  it("ignores IDs that are not in the server's options", () => {
    const answer: AnswerValue = { kind: "options", optionIds: ["yes"] };
    expect(toggleOption(question, answer, "not-a-choice")).toBe(answer);
    expect(toggleOption(fixtureQuestion({ options: null }), undefined, "yes")).toBeUndefined();
  });
});

describe("server-owned question navigation", () => {
  const questions = ["first", "follow-up", "last"].map(id => fixtureQuestion({ id }));

  it("only considers unanswered questions in the latest visible list", () => {
    const view = fixtureAssessment({ questions, answers: { first: { kind: "option", optionId: "yes" }, hidden: { kind: "option", optionId: "yes" } } });
    expect(firstUnanswered(view)).toBe("follow-up");
    expect(firstUnanswered(fixtureAssessment({ questions: [] }))).toBeNull();
  });

  it("follows the latest server order, including newly introduced follow-ups", () => {
    const view = fixtureAssessment({ questions, answers: { first: { kind: "option", optionId: "yes" } } });
    expect(nextQuestion(view, "first", false)).toBe("follow-up");
    expect(nextQuestion(view, "follow-up", false)).toBe("last");
    expect(nextQuestion({ ...view, questions: [questions[0], questions[2]] }, "first", false)).toBe("last");
  });

  it("returns to the first unanswered visible question at the end", () => {
    expect(nextQuestion(fixtureAssessment({ questions }), "last", false)).toBe("first");
  });

  it("finds new unanswered branches when an answer is changed from review", () => {
    const view = fixtureAssessment({ questions, answers: { first: { kind: "option", optionId: "yes" }, last: { kind: "number", value: 0 } } });
    expect(nextQuestion(view, "first", true)).toBe("follow-up");
    const complete = { ...view, answers: { ...view.answers, "follow-up": { kind: "option" as const, optionId: "yes" } } };
    expect(firstUnanswered(complete)).toBeNull();
    expect(nextQuestion(complete, "first", true)).toBeNull();
    expect(nextQuestion(complete, "last", false)).toBeNull();
  });

  it("recovers to the visible list if the current question was removed", () => {
    expect(nextQuestion(fixtureAssessment({ questions }), "removed", false)).toBe("first");
    expect(nextQuestion(fixtureAssessment({ questions: [] }), "removed", false)).toBeNull();
  });
});

describe("safeEvidenceUrl", () => {
  it.each([null, "", "not a URL", "/relative", "//firm.example/policy", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd", "ftp://firm.example", "mailto:person@firm.example", " JAVASCRIPT:alert(1) "])("rejects unsafe or invalid source %s", value => {
    expect(safeEvidenceUrl(value)).toBeNull();
  });

  it.each(["http://firm.example/policy", "https://firm.example/policy?source=scan#ai"])("allows an absolute web source %s", value => {
    expect(safeEvidenceUrl(value)).toBe(value);
  });

  it("normalizes a valid source through URL parsing", () => {
    expect(safeEvidenceUrl("HTTPS://FIRM.EXAMPLE")).toBe("https://firm.example/");
  });
});

describe("assessmentHref", () => {
  it("encodes opaque IDs without adding capability tokens or personal data", () => {
    expect(assessmentHref("scan/one?x=1", "as&two")).toBe("/assessment?scan=scan%2Fone%3Fx%3D1&a=as%26two");
    expect(assessmentHref("sc_demo", "as_demo", true)).toBe("/assessment/results?scan=sc_demo&a=as_demo");
  });
});
