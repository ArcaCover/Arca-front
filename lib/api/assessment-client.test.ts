import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnswerValue } from "@arca/contracts";

import { ApiError, completeAssessment, getAssessment, getAssessmentResult, saveAnswer, startAssessment } from "@/lib/api/client";
import { fixtureAssessment, fixtureAssessmentResult, fixtureQuestion } from "@/lib/test-fixtures/assessment";

const token = "synthetic-test-capability";
const auth = { Authorization: `Bearer ${token}` };

describe("assessment API client", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test///");
    // An unconfigured mock fails locally instead of ever contacting a service.
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("starts an assessment with an encoded scan ID and the capability in a header", async () => {
    const response = { assessmentId: "as_demo", status: "PLANNING" };
    fetchMock.mockResolvedValue(Response.json(response, { status: 202 }));

    expect(await startAssessment("sc/one?part=2", token)).toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://api.test/scan/sc%2Fone%3Fpart%3D2/assessment", {
      method: "POST", headers: auth, signal: expect.any(AbortSignal),
    });
  });

  it("reads the server's assessment, including visible questions and recorded answers", async () => {
    const response = fixtureAssessment({
      status: "IN_PROGRESS", planner: "agent", intro: "Review the evidence and answer each question.",
      answers: { "governance.policy": { kind: "option", optionId: "yes" } },
      skipped: [{ id: "governance.disclosure", text: "Is AI use disclosed?", creditText: "Public evidence confirmed disclosure." }],
      progress: { answered: 1, total: 1 },
    });
    fetchMock.mockResolvedValue(Response.json(response));

    expect(await getAssessment("as/one?part=2", token)).toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://api.test/assessment/as%2Fone%3Fpart%3D2", {
      headers: auth, signal: expect.any(AbortSignal),
    });
  });

  const answers: AnswerValue[] = [
    { kind: "option", optionId: "yes" },
    { kind: "options", optionIds: ["first", "second"] },
    { kind: "scale", value: 3 },
    { kind: "number", value: 0 },
  ];
  it.each(answers)("saves a $kind answer and uses the updated visible list", async answer => {
    const response = fixtureAssessment({ questions: [fixtureQuestion({ id: "new-follow-up" })], answers: { "original": answer } });
    fetchMock.mockResolvedValue(Response.json(response));

    expect(await saveAnswer("as/one", "question?part=2", answer, token)).toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://api.test/assessment/as%2Fone/answers/question%3Fpart%3D2", {
      method: "PUT", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ answer }), signal: expect.any(AbortSignal),
    });
  });

  it("completes with explicit attestation and returns the server's decision unchanged", async () => {
    const response = fixtureAssessmentResult({ layer2Score: 95, tier: "GUARDED", decision: "REFERRAL_SENIOR" });
    fetchMock.mockResolvedValue(Response.json(response));

    expect(await completeAssessment("as/one", token)).toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://api.test/assessment/as%2Fone/complete", {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ attestation: true }), signal: expect.any(AbortSignal),
    });
  });

  it("retrieves a result without inventing a missing Layer 1 or composite score", async () => {
    const response = fixtureAssessmentResult({ layer1Score: null, compositeScore: null, tier: "UNKNOWN", decision: "UNKNOWN" });
    fetchMock.mockResolvedValue(Response.json(response));

    expect(await getAssessmentResult("as/one", token)).toEqual(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://api.test/assessment/as%2Fone/result", {
      headers: auth, signal: expect.any(AbortSignal),
    });
  });

  it("gives requests a 15-second abort deadline", async () => {
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    fetchMock.mockResolvedValue(Response.json(fixtureAssessment()));

    await getAssessment("as_demo", token);
    expect(timeout).toHaveBeenCalledExactlyOnceWith(15000);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(signal);
  });

  const operations: [string, () => Promise<unknown>][] = [
    ["start", () => startAssessment("sc_demo", token)],
    ["read", () => getAssessment("as_demo", token)],
    ["save", () => saveAnswer("as_demo", "governance.policy", { kind: "option", optionId: "yes" }, token)],
    ["complete", () => completeAssessment("as_demo", token)],
    ["result", () => getAssessmentResult("as_demo", token)],
  ];

  it.each(operations)("rejects a mismatched %s response as a contract error", async (_name, request) => {
    fetchMock.mockResolvedValue(Response.json({ unexpected: true }));
    await expect(request()).rejects.toMatchObject({ name: "ApiError", code: "contract" });
  });

  it.each(operations)("rejects non-JSON %s success responses as a contract error", async (_name, request) => {
    fetchMock.mockResolvedValue(new Response("<html>Service unavailable</html>"));
    await expect(request()).rejects.toMatchObject({ code: "contract" });
  });

  it("rejects extra start-response fields instead of silently accepting schema drift", async () => {
    fetchMock.mockResolvedValue(Response.json({ assessmentId: "as_demo", status: "READY", unknown: true }));
    await expect(startAssessment("sc_demo", token)).rejects.toMatchObject({ code: "contract" });
  });

  const invalidViews: [string, unknown][] = [
    ["unknown root field", { ...fixtureAssessment(), unknown: true }],
    ["unrecognized status", { ...fixtureAssessment(), status: "SCORED" }],
    ["persistent session scope", { ...fixtureAssessment(), sessionScope: "PERSISTENT" }],
    ["invalid expiry", { ...fixtureAssessment(), expiresAt: "tomorrow" }],
    ["non-demo bank", { ...fixtureAssessment(), bankStatus: "APPROVED" }],
    ["extra question field", { ...fixtureAssessment(), questions: [{ ...fixtureQuestion(), clientScore: 100 }] }],
    ["extra option field", { ...fixtureAssessment(), questions: [{ ...fixtureQuestion(), options: [{ id: "yes", label: "Yes", exclusive: false, points: 100 }] }] }],
    ["extra evidence field", { ...fixtureAssessment(), questions: [{ ...fixtureQuestion(), evidence: [{ ...fixtureQuestion().evidence[0], trusted: true }] }] }],
    ["extra answer field", { ...fixtureAssessment(), answers: { policy: { kind: "option", optionId: "yes", verified: true } } }],
    ["empty multi-select answer", { ...fixtureAssessment(), answers: { policy: { kind: "options", optionIds: [] } } }],
    ["negative progress", { ...fixtureAssessment(), progress: { answered: -1, total: 1 } }],
  ];
  it.each(invalidViews)("rejects an assessment with %s", async (_name, response) => {
    fetchMock.mockResolvedValue(Response.json(response));
    await expect(getAssessment("as_demo", token)).rejects.toMatchObject({ code: "contract" });
  });

  const result = fixtureAssessmentResult();
  const invalidResults: [string, unknown][] = [
    ["unknown root field", { ...result, quotedPremium: 500 }],
    ["commercial decisions enabled", { ...result, commercialDecisionBlocked: false }],
    ["non-demo bank", { ...result, bankStatus: "APPROVED" }],
    ["out-of-range score", { ...result, layer2Score: 101 }],
    ["missing domain", { ...result, domains: result.domains.slice(1) }],
    ["extra domain field", { ...result, domains: result.domains.map(domain => ({ ...domain, internalWeight: 20 })) }],
    ["extra action field", { ...result, actionPlan: [{ ...result.actionPlan[0], underwritingRule: "private" }] }],
    ["unrecognized decision", { ...result, decision: "APPROVED" }],
  ];
  it.each(invalidResults)("rejects a result with %s", async (_name, response) => {
    fetchMock.mockResolvedValue(Response.json(response));
    await expect(getAssessmentResult("as_demo", token)).rejects.toMatchObject({ code: "contract" });
  });

  it.each(["scan_not_ready", "assessment_exists", "invalid_answer", "not_visible", "incomplete", "already_completed", "expired", "planning_failed", "not_ready", "conflict", "unauthorized", "not_found"])("preserves the typed %s error and does not retry", async code => {
    fetchMock.mockResolvedValue(Response.json({ error: code, message: "A synthetic service error." }, { status: 409 }));
    const error = await getAssessment("as_demo", token).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code, message: "A synthetic service error." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves rate-limit retry timing", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "rate_limited", message: "Try later." }, { status: 429, headers: { "Retry-After": "45" } }));
    await expect(startAssessment("sc_demo", token)).rejects.toMatchObject({ code: "rate_limited", retryAfter: 45 });
  });

  it("does not attach Retry-After to unrelated errors", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "expired", message: "This session expired." }, { status: 401, headers: { "Retry-After": "45" } }));
    await expect(getAssessment("as_demo", token)).rejects.toMatchObject({ code: "expired", retryAfter: undefined });
  });

  it("handles malformed error bodies without leaking an untyped parse failure", async () => {
    fetchMock.mockResolvedValue(new Response("Bad gateway", { status: 502 }));
    await expect(getAssessment("as_demo", token)).rejects.toMatchObject({ code: "internal_error" });
  });

  it.each([new TypeError("Failed to fetch"), new DOMException("Timed out", "TimeoutError")])("normalizes network and timeout failures without retrying", async cause => {
    fetchMock.mockRejectedValue(cause);
    await expect(completeAssessment("as_demo", token)).rejects.toMatchObject({ code: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
