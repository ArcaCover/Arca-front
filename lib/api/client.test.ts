import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, downloadReport, startScan } from "@/lib/api/client";
import { SCENARIO_STORAGE_KEY } from "@/lib/debug/bridge";

describe("API base URL", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("requires an explicit API URL even in a production build", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([37]), { headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadReport("sc_1", "token-1")).rejects.toMatchObject({ code: "misconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still refuses to guess outside production", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    const error = await downloadReport("sc_1", "token-1").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "misconfigured" });
  });
});

describe("downloadReport", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("asks with the scan token and keeps the API's filename", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([37, 80, 68, 70]), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="arca-quick-scan-smithlaw.com-2026-09-11.pdf"',
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { blob, filename } = await downloadReport("sc_1", "token-1");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/scan/sc_1/report.pdf",
      { headers: { Authorization: "Bearer token-1" }, signal: expect.any(AbortSignal) });
    expect(filename).toBe("arca-quick-scan-smithlaw.com-2026-09-11.pdf");
    expect(blob.size).toBe(4);
  });

  it("surfaces a scan without a report as a typed error", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: "report_unavailable", message: "The report exists once the scan has a result" }, { status: 409 })));

    const error = await downloadReport("sc_1", "token-1").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "report_unavailable" });
  });
});

// The debug scenario rides on POST /scan only in a debug build (DN-09 §5.3, §8.11). These tests run in Node, which has
// no sessionStorage, so each one installs the storage it needs.
describe("startScan and the debug scenario header", () => {
  const SCENARIO = JSON.stringify({ bar: "apify_quota", avvo: "apify_quota" });
  const fetchMock = vi.fn<typeof fetch>();
  const sentHeaders = (call = 0) => fetchMock.mock.calls[call]?.[1]?.headers;
  let stored: Map<string, string>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    stored = new Map([[SCENARIO_STORAGE_KEY, SCENARIO]]);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      removeItem: (key: string) => void stored.delete(key),
    });
    fetchMock.mockImplementation(async () =>
      Response.json({ scanId: "sc_1", sessionToken: "token-1", status: "RUNNING" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("sends no scenario header in production, even with a scenario stored", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", undefined);

    await startScan({ email: "partner@firm.example", domain: "firm.example" });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentHeaders()).toEqual({ "Content-Type": "application/json" });
    expect(stored.get(SCENARIO_STORAGE_KEY)).toBe(SCENARIO);
  });

  it("sends the stored scenario in mock", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");

    await startScan({ email: "partner@firm.example", domain: "firm.example" });

    expect(sentHeaders()).toEqual({ "Content-Type": "application/json", "X-Arca-Debug-Scenario": SCENARIO });
  });

  it("sends the scenario with the next scan only: the one after it is a clean scan", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");

    await startScan({ email: "partner@firm.example", domain: "firm.example" });
    await startScan({ email: "partner@firm.example", domain: "firm.example" });

    expect(sentHeaders(0)).toEqual({ "Content-Type": "application/json", "X-Arca-Debug-Scenario": SCENARIO });
    expect(sentHeaders(1)).toEqual({ "Content-Type": "application/json" });
    expect(stored.has(SCENARIO_STORAGE_KEY)).toBe(false);
  });

  it("still starts the scan, without the header, where there is no sessionStorage at all", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", fetchMock);
    expect(typeof globalThis.sessionStorage).toBe("undefined");

    await expect(startScan({ email: "partner@firm.example", domain: "firm.example" })).resolves.toMatchObject({ scanId: "sc_1" });
    expect(sentHeaders()).toEqual({ "Content-Type": "application/json" });
  });
});
