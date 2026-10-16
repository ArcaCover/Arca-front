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

  it("does not allow suggestions or answer controls to change during a save", async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={fixtureQuestion({ suggestedAnswer: { kind: "option", optionId: "yes" } })} answer={undefined} onAnswer={onAnswer} disabled />);
    await userEvent.click(screen.getByRole("button", { name: "Use this answer" }));
    await userEvent.click(input("radio", "Yes"));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
