// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockSeed } from "./mock-seed";

// DN-11 section 4.6: the mock back's demo organization, which only the debug panel asks for.
describe("mockSeed", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const seeded = {
    organization: { id: "org_demo", name: "Robust Law (demo)" },
    users: [
      { email: "owner@demo.arca.example", role: "owner" },
      { email: "viewer@demo.arca.example", role: "viewer" },
      { email: "ops@demo.arca.example", role: "platform_admin" },
    ],
  };

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts to /__debug/seed with the debug header and no session, and returns the organization and its users", async () => {
    localStorage.setItem("arca.app.session", JSON.stringify({ token: "app-token", email: "a@b.co", expiresAt: "2099-01-01T00:00:00.000Z" }));
    fetchMock.mockResolvedValueOnce(Response.json(seeded));

    await expect(mockSeed()).resolves.toEqual(seeded);

    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(String(url)).toBe("http://api.test/__debug/seed");
    expect(init?.method).toBe("POST");
    expect(headers.get("X-Arca-Debug")).toBe("1");
    expect(headers.has("Authorization")).toBe(false);
    localStorage.clear();
  });

  // The back runs a whole scan and answers 504 after 60 seconds; the browser must not give up first.
  it("waits longer than the back's own limit", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockResolvedValueOnce(Response.json(seeded));

    await mockSeed();

    expect(timeout).toHaveBeenCalledWith(75_000);
    timeout.mockRestore();
  });

  it("refuses an answer that carries a token, and surfaces the back's refusal", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...seeded, users: [{ ...seeded.users[0], token: "jwt" }] }));
    await expect(mockSeed()).rejects.toMatchObject({ code: "contract" });

    fetchMock.mockResolvedValueOnce(Response.json({ error: "not_found", message: "Not found" }, { status: 404 }));
    await expect(mockSeed()).rejects.toMatchObject({ name: "ApiError", code: "not_found" });
  });
});
