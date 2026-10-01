import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, downloadReport } from "@/lib/api/client";

describe("API base URL", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("defaults to the production API in a production build without the variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([37]), { headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);

    await downloadReport("sc_1", "token-1");

    expect(fetchMock).toHaveBeenCalledWith("https://api.arcacover.com/scan/sc_1/report.pdf", expect.anything());
  });

  it("still refuses to guess outside production", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    const error = await downloadReport("sc_1", "token-1").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "misconfigured" });
  });
});

describe("downloadReport", () => {
  afterEach(() => vi.unstubAllGlobals());

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
      { headers: { Authorization: "Bearer token-1" } });
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
