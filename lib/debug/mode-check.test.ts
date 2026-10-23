import type { DebugModeResponse } from "@arca/contracts/debug";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkModes, probeBackMode } from "./mode-check";

const BACK: DebugModeResponse = {
  mode: "mock",
  sourceMode: "mock",
  storageBackend: "memory",
  websiteEvidenceProvider: "mock",
  assessmentPlanner: "rules",
  signalLlmModel: null,
  inUse: { openai: false, apify: false, supabase: false },
};

const answer = (status: number, body: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("probeBackMode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks the back's /__debug/mode and returns the mode it reports", async () => {
    const fetcher = answer(200, BACK);

    expect(await probeBackMode("http://127.0.0.1:8787", fetcher)).toEqual({ kind: "ok", body: BACK });
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/__debug/mode",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("calls a 404 absent: a production back has no debug routes", async () => {
    expect(await probeBackMode("http://api", answer(404, { error: "not_found" }))).toEqual({ kind: "absent" });
  });

  it("calls a body that is not a debug mode absent", async () => {
    const html = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>"));

    expect(await probeBackMode("http://api", answer(200, { mode: "production" }))).toEqual({ kind: "absent" });
    expect(await probeBackMode("http://api", html)).toEqual({ kind: "absent" });
    // A back from before `inUse` replaced `configured` speaks another shape: never trusted as a mode.
    const { inUse, ...older } = BACK;
    expect(await probeBackMode("http://api", answer(200, { ...older, configured: inUse }))).toEqual({ kind: "absent" });
  });

  it("calls a network error unreachable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await probeBackMode("http://api", fetcher)).toEqual({ kind: "unreachable" });
  });

  it("gives up after 5 seconds and calls the back unreachable", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    // A back that never answers: the request only ends when its signal aborts.
    const fetcher = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError")));
        }),
    );

    const probe = probeBackMode("http://api", fetcher);
    controller.abort();

    expect(await probe).toEqual({ kind: "unreachable" });
    expect(timeout).toHaveBeenCalledWith(5000);
  });
});

describe("checkModes", () => {
  it("never vouches for a back that did not answer with a mode", () => {
    expect(checkModes("mock", { kind: "absent" })).toEqual({
      state: "mismatch",
      label: "MODE MISMATCH · front=mock, back unreachable or production",
    });
    expect(checkModes("live-debug", { kind: "unreachable" })).toEqual({
      state: "mismatch",
      label: "MODE MISMATCH · front=live-debug, back unreachable or production",
    });
  });

  it("names both modes when the back runs another one", () => {
    expect(checkModes("mock", { kind: "ok", body: { ...BACK, mode: "live-debug" } })).toEqual({
      state: "mismatch",
      label: "MODE MISMATCH · front=mock, back=live-debug",
    });
  });

  it("matches when the back runs the front's mode", () => {
    expect(checkModes("mock", { kind: "ok", body: BACK })).toEqual({ state: "match", mode: "mock" });
  });
});
