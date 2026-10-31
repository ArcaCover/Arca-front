// @vitest-environment jsdom
import type { AnswerValue } from "@arca/contracts";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rememberAssessment } from "@/lib/api/assessment-session";
import { ApiError, completeAssessment, getAssessment, saveAnswer } from "@/lib/api/client";
import { rememberSession } from "@/lib/api/session";
import { fixtureAssessment, fixtureAssessmentResult } from "@/lib/test-fixtures/assessment";
import AssessmentControls from "./AssessmentControls";

const navigation = vi.hoisted(() => ({ router: { push: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation.router }));
vi.mock("@/lib/api/client", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  getAssessment: vi.fn(),
  saveAnswer: vi.fn(),
  completeAssessment: vi.fn(),
}));

const yes: AnswerValue = { kind: "option", optionId: "yes" };
const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });
const reload = vi.fn();

beforeEach(() => {
  rememberSession("sc_demo", "synthetic-test-capability");
  rememberAssessment("sc_demo", "as_demo", new Date(Date.now() + 3_600_000).toISOString());
  vi.stubGlobal("location", { reload });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("AssessmentControls", () => {
  it("answers every pending question through the API with this tab's session, then reloads the page", async () => {
    vi.mocked(getAssessment).mockResolvedValue(fixtureAssessment());
    vi.mocked(saveAnswer).mockResolvedValue(fixtureAssessment({ answers: { "governance.policy": yes }, progress: { answered: 1, total: 1 } }));
    render(<AssessmentControls scanId="sc_demo" />);

    await userEvent.click(button("Auto-answer"));

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(getAssessment).toHaveBeenCalledExactlyOnceWith("as_demo", "synthetic-test-capability");
    expect(saveAnswer).toHaveBeenCalledExactlyOnceWith("as_demo", "governance.policy", yes, "synthetic-test-capability");
  });

  it("completes with the attestation and opens the results", async () => {
    vi.mocked(completeAssessment).mockResolvedValue(fixtureAssessmentResult());
    render(<AssessmentControls scanId="sc_demo" />);

    await userEvent.click(button("Attest & complete"));

    await waitFor(() => expect(navigation.router.push).toHaveBeenCalledExactlyOnceWith("/assessment/results?scan=sc_demo&a=as_demo"));
    expect(completeAssessment).toHaveBeenCalledExactlyOnceWith("as_demo", "synthetic-test-capability");
  });

  it("shows what the API answered and lets you try again", async () => {
    vi.mocked(completeAssessment).mockRejectedValueOnce(new ApiError("incomplete", "Every visible question needs an answer"));
    render(<AssessmentControls scanId="sc_demo" />);

    await userEvent.click(button("Attest & complete"));

    expect(await screen.findByText("Every visible question needs an answer")).toBeTruthy();
    expect(button("Attest & complete").disabled).toBe(false);
    expect(navigation.router.push).not.toHaveBeenCalled();
  });

  it("calls nothing when this tab holds no session for the scan", async () => {
    sessionStorage.clear();
    render(<AssessmentControls scanId="sc_demo" />);

    await userEvent.click(button("Auto-answer"));

    expect(await screen.findByText("This tab holds no session or assessment for this scan")).toBeTruthy();
    expect(getAssessment).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
