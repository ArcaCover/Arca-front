// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnswerValue, RenderedQuestion } from "@arca/contracts";
import QuestionCard from "@/components/assessment/QuestionCard";
import { fixtureQuestion } from "@/lib/test-fixtures/assessment";

afterEach(cleanup);

function ControlledQuestion({ question, initial, onAnswer = () => {} }: {
  question: RenderedQuestion;
  initial?: AnswerValue;
  onAnswer?: (answer: AnswerValue | undefined) => void;
}) {
  const [answer, setAnswer] = useState(initial);
  return <QuestionCard question={question} answer={answer} onAnswer={value => { setAnswer(value); onAnswer(value); }} />;
}

const input = (role: "radio" | "checkbox", name: string) => screen.getByRole<HTMLInputElement>(role, { name });

describe("QuestionCard interactions", () => {
  it("shows a suggestion without selecting or saving it until explicitly accepted", async () => {
    const onAnswer = vi.fn();
    render(<ControlledQuestion question={fixtureQuestion({ suggestedAnswer: { kind: "option", optionId: "yes" } })} onAnswer={onAnswer} />);
    expect(screen.getByText("A suggestion to review")).toBeTruthy();
    expect(input("radio", "Yes").checked).toBe(false);
    expect(onAnswer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Use this answer" }));
    expect(input("radio", "Yes").checked).toBe(true);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({ kind: "option", optionId: "yes" });
    expect(screen.queryByText("A suggestion to review")).toBeNull();
  });

  it.each(["single_select", "yes_no"] as const)("supports selecting and changing a %s answer", async type => {
    const onAnswer = vi.fn();
    render(<ControlledQuestion question={fixtureQuestion({ type })} onAnswer={onAnswer} />);
    await userEvent.click(input("radio", "Yes"));
    await userEvent.click(input("radio", "No"));
    expect(input("radio", "Yes").checked).toBe(false);
    expect(input("radio", "No").checked).toBe(true);
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "option", optionId: "no" });
  });

  it("supports several selections, exclusive answers, and clearing the last selection", async () => {
    const onAnswer = vi.fn();
    render(<ControlledQuestion question={fixtureQuestion({ type: "multi_select" })} onAnswer={onAnswer} />);
    await userEvent.click(input("checkbox", "Yes"));
    await userEvent.click(input("checkbox", "No"));
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "options", optionIds: ["yes", "no"] });
    await userEvent.click(input("checkbox", "Not sure"));
    expect(input("checkbox", "Yes").checked).toBe(false);
    expect(input("checkbox", "No").checked).toBe(false);
    expect(input("checkbox", "Not sure").checked).toBe(true);
    await userEvent.click(input("checkbox", "Yes"));
    expect(input("checkbox", "Not sure").checked).toBe(false);
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "options", optionIds: ["yes"] });
    await userEvent.click(input("checkbox", "Yes"));
    expect(onAnswer).toHaveBeenLastCalledWith(undefined);
  });

  it("does not count a scale's displayed minimum as an answer; zero needs an explicit choice", async () => {
    const onAnswer = vi.fn();
    render(<ControlledQuestion question={fixtureQuestion({
      type: "scale", options: null,
      scale: { min: 0, max: 5, step: 1, minLabel: "Never", maxLabel: "Always" },
    })} onAnswer={onAnswer} />);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("No answer selected");
    expect(screen.getByText("Choose a value")).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "0: Never" }));
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "scale", value: 0 });
    expect(screen.getByRole("button", { name: "0: Never" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "4" } });
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "scale", value: 4 });
  });

  it("starts number inputs empty and supports zero, typing, clearing, and bounded controls", async () => {
    const onAnswer = vi.fn();
    render(<ControlledQuestion question={fixtureQuestion({
      type: "number", options: null, number: { min: 0, max: 2, unit: "employees" },
    })} onAnswer={onAnswer} />);
    const number = screen.getByRole<HTMLInputElement>("spinbutton");
    expect(number.value).toBe("");
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Decrease value" }).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Increase value" }));
    expect(number.value).toBe("0");
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "number", value: 0 });
    await userEvent.clear(number);
    expect(onAnswer).toHaveBeenLastCalledWith(undefined);
    await userEvent.type(number, "2");
    expect(onAnswer).toHaveBeenLastCalledWith({ kind: "number", value: 2 });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Increase value" }).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Decrease value" }));
    expect(number.value).toBe("1");
  });

  it("keeps context and source evidence explicit and does not render unsafe links", async () => {
    render(<ControlledQuestion question={fixtureQuestion({
      scored: false, help: "Review your current practices.", context: "The scan found a policy.",
      evidence: [
        { id: "safe", signal: "W1_aiPolicy", value: true, text: "Policy source", sourceUrl: "https://firm.example/policy" },
        { id: "unsafe", signal: "W1_aiPolicy", value: null, text: "Unlinked signal", sourceUrl: "javascript:alert(1)" },
      ],
    })} />);
    expect(screen.getByText("Context only · does not affect your score")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Is there a written AI policy?" }).getAttribute("aria-describedby")).toBe("question-help");
    await userEvent.click(screen.getByText("Evidence from your quick scan (2)"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    const source = screen.getByRole("link", { name: "View source" });
    expect(source.getAttribute("href")).toBe("https://firm.example/policy");
    expect(source.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("Recorded scan signal · no source link")).toBeTruthy();
  });

  it("shows a context sentence once when the scan evidence is that same sentence", () => {
    const sentence = "The public scan detected an AI policy. Internal distribution still needs your confirmation.";
    render(<ControlledQuestion question={fixtureQuestion({
      context: sentence,
      evidence: [{ id: "policy", signal: "W1_aiPolicy", value: true, text: sentence, sourceUrl: null }],
    })} />);
    expect(screen.getAllByText(sentence)).toHaveLength(1);
    expect(screen.queryByText(/Evidence from your quick scan/)).toBeNull();
    expect(screen.queryByText("Recorded scan signal · no source link")).toBeNull();
  });

  it("keeps the source link of the context sentence and still lists the other evidence", async () => {
    const sentence = "The public scan detected an AI policy.";
    render(<ControlledQuestion question={fixtureQuestion({
      context: sentence,
      evidence: [
        { id: "policy", signal: "W1_aiPolicy", value: true, text: sentence, sourceUrl: "https://firm.example/policy" },
        { id: "services", signal: "W2_aiInServices", value: true, text: "AI is mentioned in the services.", sourceUrl: "https://firm.example/services" },
      ],
    })} />);
    expect(screen.getAllByText(sentence)).toHaveLength(1);
    const source = screen.getByText(sentence).closest("div")!.querySelector("a")!;
    expect(source.textContent).toBe("View source");
    expect(source.getAttribute("href")).toBe("https://firm.example/policy");
    expect(source.getAttribute("rel")).toBe("noopener noreferrer");
    await userEvent.click(screen.getByText("Evidence from your quick scan (1)"));
    expect(screen.getByText("AI is mentioned in the services.")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "View source" })).toHaveLength(2);
  });

  it.each([
    ["the bank's help already says it", "Select all that apply. “None” cannot be combined with other choices."],
    ["the bank sends no help", null],
  ])("tells a multi-select to select all that apply once when %s", (_case, help) => {
    render(<ControlledQuestion question={fixtureQuestion({ type: "multi_select", help })} />);
    expect(document.body.textContent!.match(/Select all that apply/g)).toHaveLength(1);
    if (help) expect(screen.getByText(help)).toBeTruthy();
  });

  it("says once that a follow-up does not affect the score", () => {
    render(<ControlledQuestion question={fixtureQuestion({ scored: false, help: "This follow-up adds context and does not change the demo score." })} />);
    expect(document.body.textContent!.match(/does not (affect|change)/g)).toHaveLength(1);
    expect(screen.getByText("Context only · does not affect your score")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Is there a written AI policy?" }).getAttribute("aria-describedby")).toBeNull();
  });

  it("keeps a follow-up's help when it says something else", () => {
    render(<ControlledQuestion question={fixtureQuestion({ scored: false, help: "Count every office." })} />);
    expect(screen.getByText("Count every office.")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Is there a written AI policy?" }).getAttribute("aria-describedby")).toBe("question-help");
  });

  it("does not allow suggestions or answer controls to change during a save", async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={fixtureQuestion({ suggestedAnswer: { kind: "option", optionId: "yes" } })} answer={undefined} onAnswer={onAnswer} disabled />);
    await userEvent.click(screen.getByRole("button", { name: "Use this answer" }));
    await userEvent.click(input("radio", "Yes"));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
