// @vitest-environment jsdom
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnswerValue, AssessmentView, PollResponse, StartedAssessmentResponse } from "@arca/contracts";
import AssessmentPage from "@/app/assessment/page";
import AssessmentResultsPage from "@/app/assessment/results/page";
import ScorePage from "@/app/score/page";
import { ApiError, completeAssessment, getAssessment, getAssessmentResult, pollScan, saveAnswer, startAssessment } from "@/lib/api/client";
import { recallSession, rememberSession } from "@/lib/api/session";
import { recallAssessment, rememberAssessment } from "@/lib/api/assessment-session";
import { fixtureAssessment, fixtureAssessmentResult, fixtureQuestion } from "@/lib/test-fixtures/assessment";
import { fixtureResult } from "@/lib/api/fixture";

const navigation = vi.hoisted(() => ({
  query: "scan=sc_demo&a=as_demo",
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
vi.mock("next/link", () => ({ default: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
vi.mock("@/lib/api/client", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/api/client")>(),
  startAssessment: vi.fn(), getAssessment: vi.fn(), saveAnswer: vi.fn(),
  completeAssessment: vi.fn(), getAssessmentResult: vi.fn(), pollScan: vi.fn(),
}));

function assessment(overrides: Partial<AssessmentView> = {}) {
  return fixtureAssessment({ expiresAt: new Date(Date.now() + 3600000).toISOString(), ...overrides });
}
const yes: AnswerValue = { kind: "option", optionId: "yes" };
const no: AnswerValue = { kind: "option", optionId: "no" };
const reviewed = () => assessment({ answers: { "governance.policy": yes }, progress: { answered: 1, total: 1 } });
const button = (name: string | RegExp) => screen.getByRole<HTMLButtonElement>("button", { name });
const attestation = () => screen.getByRole<HTMLInputElement>("checkbox", { name: /I confirm these answers/ });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  navigation.query = "scan=sc_demo&a=as_demo";
  window.history.replaceState(null, "", "/assessment?scan=sc_demo&a=as_demo");
  rememberSession("sc_demo", "synthetic-test-capability");
  vi.mocked(startAssessment).mockResolvedValue({ assessmentId: "as_demo", status: "READY" });
  vi.mocked(getAssessment).mockResolvedValue(assessment());
  vi.mocked(saveAnswer).mockResolvedValue(reviewed());
  vi.mocked(completeAssessment).mockResolvedValue(fixtureAssessmentResult());
  vi.mocked(getAssessmentResult).mockResolvedValue(fixtureAssessmentResult());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("assessment route interactions", () => {
  it("starts once without a saved ID, stores only the resume ID, and keeps suggestions unselected", async () => {
    navigation.query = "scan=sc_demo";
    vi.mocked(getAssessment).mockResolvedValue(assessment({ questions: [fixtureQuestion({ suggestedAnswer: yes })] }));
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "Is there a written AI policy?" });
    expect(startAssessment).toHaveBeenCalledExactlyOnceWith("sc_demo", "synthetic-test-capability");
    expect(recallAssessment("sc_demo")).toBe("as_demo");
    expect(window.location.search).toBe("?scan=sc_demo&a=as_demo");
    expect(window.location.href).not.toContain("synthetic-test-capability");
    expect(button("Continue").disabled).toBe(true);
    expect(saveAnswer).not.toHaveBeenCalled();
    await userEvent.click(button("Use this answer"));
    expect(button("Continue").disabled).toBe(false);
    expect(saveAnswer).not.toHaveBeenCalled();
    await userEvent.click(button("Continue"));
    await screen.findByRole("heading", { name: "One last look." });
    expect(saveAnswer).toHaveBeenCalledExactlyOnceWith("as_demo", "governance.policy", yes, "synthetic-test-capability");
    expect(sessionStorage.getItem("arca.assessment.sc_demo")).not.toContain("optionId");
  });

  it("preserves the selected draft after a failed save and retries without duplicate requests", async () => {
    const pending = deferred<AssessmentView>();
    vi.mocked(saveAnswer).mockRejectedValueOnce(new ApiError("network", "Offline")).mockReturnValueOnce(pending.promise);
    render(<AssessmentPage />);
    await screen.findByRole("radio", { name: "Yes" });
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Continue"));
    expect((await screen.findByRole("alert")).textContent).toContain("still selected");
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Yes" }).checked).toBe(true);
    expect(button("Continue").disabled).toBe(false);
    await userEvent.dblClick(button("Continue"));
    expect(saveAnswer).toHaveBeenCalledTimes(2);
    expect(button("Saving…").disabled).toBe(true);
    await act(async () => pending.resolve(reviewed()));
    expect(screen.getByRole("heading", { name: "One last look." })).toBeTruthy();
  });

  it("resumes the first unanswered server question after a reload without starting over", async () => {
    navigation.query = "scan=sc_demo";
    rememberAssessment("sc_demo", "as_demo");
    const second = fixtureQuestion({ id: "training.frequency", text: "How often is training reviewed?" });
    const view = assessment({ questions: [fixtureQuestion(), second], answers: { "governance.policy": yes }, progress: { answered: 1, total: 2 } });
    vi.mocked(getAssessment).mockResolvedValue(view);
    const firstMount = render(<AssessmentPage />);
    await screen.findByRole("heading", { name: second.text });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
    firstMount.unmount();
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: second.text });
    expect(startAssessment).not.toHaveBeenCalled();
    expect(getAssessment).toHaveBeenCalledTimes(2);
    await userEvent.click(button("Back"));
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Yes" }).checked).toBe(true);
  });

  it("uses the latest server question list to add a follow-up and remove its invalidated answer after editing", async () => {
    const core = fixtureQuestion();
    const followUp = fixtureQuestion({ id: "governance.owner", text: "Who owns this policy?", scored: false });
    vi.mocked(saveAnswer)
      .mockResolvedValueOnce(assessment({ questions: [core, followUp], answers: { [core.id]: yes }, progress: { answered: 1, total: 2 } }))
      .mockResolvedValueOnce(assessment({ questions: [core, followUp], answers: { [core.id]: yes, [followUp.id]: no }, progress: { answered: 2, total: 2 } }))
      .mockResolvedValueOnce(assessment({ questions: [core], answers: { [core.id]: no }, progress: { answered: 1, total: 1 } }));
    render(<AssessmentPage />);
    await screen.findByRole("radio", { name: "Yes" });
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Continue"));
    await screen.findByRole("heading", { name: followUp.text });
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    expect(screen.getByText("Context only · does not affect your score")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    await userEvent.click(button("Continue"));
    await screen.findByRole("heading", { name: "One last look." });
    expect(screen.getByText(followUp.text)).toBeTruthy();
    await userEvent.click(attestation());
    await userEvent.click(button(`Edit answer: ${core.text}`));
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    await userEvent.click(button("Save change"));
    await screen.findByRole("heading", { name: "One last look." });
    expect(screen.queryByText(followUp.text)).toBeNull();
    expect(screen.getAllByRole("button", { name: /Edit answer:/ })).toHaveLength(1);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("1");
    expect(attestation().checked).toBe(false);
    expect(button("See my demo score").disabled).toBe(true);
  });

  it("answers a new branch introduced while editing and returns directly to review", async () => {
    const followUp = fixtureQuestion({ id: "tools.detail", text: "Which approved tool do you use?", scored: false });
    const last = fixtureQuestion({ id: "last", text: "An already answered final question" });
    const answers = { "governance.policy": no, [last.id]: yes };
    vi.mocked(getAssessment).mockResolvedValue(assessment({ questions: [fixtureQuestion(), last], answers, progress: { answered: 2, total: 2 } }));
    vi.mocked(saveAnswer)
      .mockResolvedValueOnce(assessment({ questions: [fixtureQuestion(), followUp, last], answers, progress: { answered: 2, total: 3 } }))
      .mockResolvedValueOnce(assessment({ questions: [fixtureQuestion(), followUp, last], answers: { ...answers, [followUp.id]: yes }, progress: { answered: 3, total: 3 } }));
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "One last look." });
    await userEvent.click(attestation());
    await userEvent.click(button("Edit answer: Is there a written AI policy?"));
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    await userEvent.click(button("Save change"));
    await screen.findByRole("heading", { name: followUp.text });
    expect(button("Save change").disabled).toBe(true);
    expect(completeAssessment).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Save change"));
    await screen.findByRole("heading", { name: "One last look." });
    expect(screen.queryByRole("heading", { name: last.text })).toBeNull();
    expect(screen.getByText(last.text)).toBeTruthy();
    expect(attestation().checked).toBe(false);
    expect(button("See my demo score").disabled).toBe(true);
    expect(saveAnswer).toHaveBeenCalledTimes(2);
  });

  it("requires attestation, prevents repeated completion, and navigates with opaque IDs", async () => {
    const pending = deferred<ReturnType<typeof fixtureAssessmentResult>>();
    vi.mocked(getAssessment).mockResolvedValue(reviewed());
    vi.mocked(completeAssessment).mockReturnValue(pending.promise);
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "One last look." });
    expect(button("See my demo score").disabled).toBe(true);
    await userEvent.click(button("See my demo score"));
    expect(completeAssessment).not.toHaveBeenCalled();
    await userEvent.click(attestation());
    await userEvent.dblClick(button("See my demo score"));
    expect(completeAssessment).toHaveBeenCalledExactlyOnceWith("as_demo", "synthetic-test-capability");
    expect(attestation().disabled).toBe(true);
    expect(button("Calculating…").disabled).toBe(true);
    await act(async () => pending.resolve(fixtureAssessmentResult()));
    expect(navigation.router.replace).toHaveBeenCalledWith("/assessment/results?scan=sc_demo&a=as_demo");
  });

  it("retries an uncertain completion against the same assessment", async () => {
    vi.mocked(getAssessment).mockResolvedValue(reviewed());
    vi.mocked(completeAssessment).mockRejectedValueOnce(new ApiError("network", "Offline")).mockResolvedValueOnce(fixtureAssessmentResult());
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "One last look." });
    await userEvent.click(attestation());
    await userEvent.click(button("See my demo score"));
    expect((await screen.findByRole("alert")).textContent).toContain("saved answers are safe");
    expect(attestation().checked).toBe(true);
    await userEvent.click(button("See my demo score"));
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/assessment/results?scan=sc_demo&a=as_demo"));
    expect(completeAssessment).toHaveBeenCalledTimes(2);
    expect(startAssessment).not.toHaveBeenCalled();
  });

  it("clears attestation and reloads missing questions when completion returns incomplete", async () => {
    vi.mocked(getAssessment).mockResolvedValueOnce(reviewed()).mockResolvedValueOnce(assessment());
    vi.mocked(completeAssessment).mockRejectedValue(new ApiError("incomplete", "An answer is required"));
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "One last look." });
    await userEvent.click(attestation());
    await userEvent.click(button("See my demo score"));
    await screen.findByRole("heading", { name: "Is there a written AI policy?" });
    expect(button("Continue").disabled).toBe(true);
    expect(getAssessment).toHaveBeenCalledTimes(2);
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("does not treat an untouched scale as a saved answer", async () => {
    vi.mocked(getAssessment).mockResolvedValue(assessment({ questions: [fixtureQuestion({ type: "scale", options: null, scale: { min: 0, max: 5, step: 1, minLabel: "Never", maxLabel: "Always" } })] }));
    render(<AssessmentPage />);
    await screen.findByRole("slider");
    expect(button("Continue").disabled).toBe(true);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    await userEvent.click(button("0: Never"));
    await userEvent.click(button("Continue"));
    expect(saveAnswer).toHaveBeenCalledWith("as_demo", "governance.policy", { kind: "scale", value: 0 }, "synthetic-test-capability");
  });

  it("blocks out-of-range numeric answers and accepts explicit zero", async () => {
    vi.mocked(getAssessment).mockResolvedValue(assessment({ questions: [fixtureQuestion({ type: "number", options: null, number: { min: 0, max: 10, unit: "employees" } })] }));
    render(<AssessmentPage />);
    const number = await screen.findByRole("spinbutton");
    await userEvent.type(number, "11");
    expect(button("Continue").disabled).toBe(true);
    await userEvent.clear(number);
    expect(button("Continue").disabled).toBe(true);
    await userEvent.type(number, "0");
    expect(button("Continue").disabled).toBe(false);
    await userEvent.click(button("Continue"));
    expect(saveAnswer).toHaveBeenCalledWith("as_demo", "governance.policy", { kind: "number", value: 0 }, "synthetic-test-capability");
  });

  it("loads a completed session directly into results without completion again", async () => {
    vi.mocked(getAssessment).mockResolvedValue(assessment({ status: "COMPLETED" }));
    render(<AssessmentPage />);
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/assessment/results?scan=sc_demo&a=as_demo"));
    expect(completeAssessment).not.toHaveBeenCalled();
  });

  it("shows a recoverable session screen without making requests when the tab token is missing", async () => {
    sessionStorage.clear();
    render(<AssessmentPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("no longer has access");
    expect(screen.getByRole("link", { name: "Start a new scan" }).getAttribute("href")).toBe("/quote");
    expect(getAssessment).not.toHaveBeenCalled();
    expect(startAssessment).not.toHaveBeenCalled();
  });

  it.each(["unauthorized", "expired"] as const)("clears the session and saved assessment when loading returns %s", async code => {
    rememberAssessment("sc_demo", "as_demo");
    vi.mocked(getAssessment).mockRejectedValue(new ApiError(code, "Session no longer valid"));
    render(<AssessmentPage />);
    await screen.findByRole("heading", { name: "Let’s reconnect your session." });
    expect(recallSession("sc_demo")).toBeNull();
    expect(recallAssessment("sc_demo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("expires safely when access is lost during answer save", async () => {
    vi.mocked(saveAnswer).mockRejectedValue(new ApiError("expired", "Expired"));
    render(<AssessmentPage />);
    await screen.findByRole("radio", { name: "Yes" });
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Continue"));
    await screen.findByRole("heading", { name: "Let’s reconnect your session." });
    expect(recallSession("sc_demo")).toBeNull();
    expect(recallAssessment("sc_demo")).toBeNull();
  });

  it("refreshes from the server when another update invalidated the current question", async () => {
    const replacement = fixtureQuestion({ id: "replacement", text: "A replacement question" });
    vi.mocked(getAssessment).mockResolvedValueOnce(assessment()).mockResolvedValueOnce(assessment({ questions: [replacement] }));
    vi.mocked(saveAnswer).mockRejectedValue(new ApiError("not_visible", "Question no longer visible"));
    render(<AssessmentPage />);
    await screen.findByRole("radio", { name: "Yes" });
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Continue"));
    await screen.findByRole("heading", { name: replacement.text });
    expect(getAssessment).toHaveBeenCalledTimes(2);
    expect(button("Continue").disabled).toBe(true);
  });

  it("ignores an old save after navigating to a different assessment on the same scan", async () => {
    const saving = deferred<AssessmentView>();
    vi.mocked(saveAnswer).mockReturnValue(saving.promise);
    const mounted = render(<AssessmentPage />);
    await screen.findByRole("radio", { name: "Yes" });
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(button("Continue"));
    const other = fixtureQuestion({ id: "other", text: "The other assessment question" });
    vi.mocked(getAssessment).mockResolvedValue(assessment({ assessmentId: "as_other", questions: [other] }));
    navigation.query = "scan=sc_demo&a=as_other";
    mounted.rerender(<AssessmentPage />);
    await screen.findByRole("heading", { name: other.text });
    await act(async () => saving.resolve(reviewed()));
    expect(screen.getByRole("heading", { name: other.text })).toBeTruthy();
    expect(button("Continue").disabled).toBe(true);
    expect(screen.queryByRole("heading", { name: "One last look." })).toBeNull();
  });
});

describe("assessment planning", () => {
  it("polls planning until ready without creating another assessment", async () => {
    vi.useFakeTimers();
    vi.mocked(getAssessment).mockResolvedValueOnce(assessment({ status: "PLANNING", questions: [] })).mockResolvedValueOnce(assessment());
    await act(async () => { render(<AssessmentPage />); });
    expect(screen.getByText("Preparing assessment")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    expect(screen.getByRole("heading", { name: "Is there a written AI policy?" })).toBeTruthy();
    expect(getAssessment).toHaveBeenCalledTimes(2);
    expect(startAssessment).not.toHaveBeenCalled();
  });

  it("times out with a retry path, then resumes the same assessment", async () => {
    vi.useFakeTimers();
    vi.mocked(getAssessment).mockResolvedValue(assessment({ status: "PLANNING", questions: [] }));
    await act(async () => { render(<AssessmentPage />); });
    await act(async () => { await vi.advanceTimersByTimeAsync(45600); });
    expect(screen.getByRole("alert").textContent).toContain("taking longer than usual");
    const callsAtTimeout = vi.mocked(getAssessment).mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(getAssessment).toHaveBeenCalledTimes(callsAtTimeout);
    vi.mocked(getAssessment).mockResolvedValue(assessment());
    await act(async () => { fireEvent.click(button("Try again")); });
    expect(screen.getByRole("heading", { name: "Is there a written AI policy?" })).toBeTruthy();
    expect(startAssessment).not.toHaveBeenCalled();
  });

  it("cancels planning polling on unmount", async () => {
    vi.useFakeTimers();
    vi.mocked(getAssessment).mockResolvedValue(assessment({ status: "PLANNING", questions: [] }));
    const mounted = render(<AssessmentPage />);
    await act(async () => {});
    mounted.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(getAssessment).toHaveBeenCalledTimes(1);
  });
});

describe("assessment result recovery", () => {
  it.each(["not_ready", "incomplete"] as const)("links %s results back to the existing assessment", async code => {
    vi.mocked(getAssessmentResult).mockRejectedValue(new ApiError(code, "Finish the assessment first"));
    render(<AssessmentResultsPage />);
    const link = await screen.findByRole("link", { name: "Return to assessment" });
    expect(link.getAttribute("href")).toBe("/assessment?scan=sc_demo&a=as_demo");
    expect(screen.queryByRole("link", { name: "Start a new scan" })).toBeNull();
  });

  it("retries a failed result load and renders the server score with demo boundaries", async () => {
    vi.mocked(getAssessmentResult).mockRejectedValueOnce(new ApiError("network", "Offline")).mockResolvedValueOnce(fixtureAssessmentResult());
    render(<AssessmentResultsPage />);
    await screen.findByRole("alert");
    await userEvent.click(button("Try again"));
    await screen.findByRole("img", { name: "AI Governance Score: 70 out of 100" });
    expect(screen.getByText(/Commercial decisions are blocked for this demo/)).toBeTruthy();
    expect(screen.getByText("Document the policy")).toBeTruthy();
    expect(getAssessmentResult).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: /buy|bind|quote|pay/i })).toBeNull();
  });

  it("does not retry unauthorized results or display a different scan's result", async () => {
    vi.mocked(getAssessmentResult).mockResolvedValue(fixtureAssessmentResult({ scanId: "another_scan" }));
    render(<AssessmentResultsPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("does not belong");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.queryByRole("img", { name: /AI Governance Score/ })).toBeNull();
  });
});

describe("score-to-assessment navigation", () => {
  it("isolates pending assessment creation when the scan query changes on the same route", async () => {
    const startA = deferred<StartedAssessmentResponse>();
    const startB = deferred<StartedAssessmentResponse>();
    const pollB = deferred<PollResponse>();
    rememberSession("sc_other", "synthetic-other-capability");
    navigation.query = "scan=sc_demo";
    vi.mocked(pollScan).mockResolvedValueOnce({ scanId: "sc_demo", status: "COMPLETED", cached: false, result: fixtureResult({ scanId: "sc_demo" }) }).mockReturnValueOnce(pollB.promise);
    vi.mocked(startAssessment).mockReturnValueOnce(startA.promise).mockReturnValueOnce(startB.promise);
    const mounted = render(<ScorePage />);
    await screen.findByRole("button", { name: "Refine your score" });
    expect(startAssessment).toHaveBeenCalledWith("sc_demo", "synthetic-test-capability");
    navigation.query = "scan=sc_other";
    mounted.rerender(<ScorePage />);
    expect(screen.queryByRole("button", { name: "Refine your score" })).toBeNull();
    expect(screen.getByLabelText("Loading your results")).toBeTruthy();
    await act(async () => pollB.resolve({ scanId: "sc_other", status: "COMPLETED", cached: false, result: fixtureResult({ scanId: "sc_other" }) }));
    await screen.findByRole("button", { name: "Refine your score" });
    expect(startAssessment).toHaveBeenCalledWith("sc_other", "synthetic-other-capability");
    await userEvent.click(button("Refine your score"));
    await act(async () => startA.resolve({ assessmentId: "as_first", status: "READY" }));
    expect(navigation.router.push).not.toHaveBeenCalled();
    expect(recallSession("sc_other")).toBe("synthetic-other-capability");
    await act(async () => startB.resolve({ assessmentId: "as_other", status: "READY" }));
    expect(navigation.router.push).toHaveBeenCalledExactlyOnceWith("/assessment?scan=sc_other&a=as_other");
    expect(recallAssessment("sc_other")).toBe("as_other");
    expect(recallAssessment("sc_demo")).toBe("as_first");
  });
});
