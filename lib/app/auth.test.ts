// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signIn, signOut } from "./auth";
import { loadAppSession, loadPendingClaim, recallOrg, rememberOrg, saveAppSession, savePendingClaim } from "./session";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signIn", () => {
  // In live-debug the back keeps the webapp in memory beside the real scans, with the same simulated login as mock.
  it.each(["mock", "live-debug"])("signs in through the debug bridge in %s, and keeps the session it gets", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    fetchMock.mockResolvedValueOnce(Response.json({ token: "mock-jwt", user: { userId: "u_1", email: "ana@smithlaw.com" }, expiresAt }));

    await expect(signIn("ana@smithlaw.com")).resolves.toBe("signed_in");

    expect(loadAppSession()).toEqual({ token: "mock-jwt", email: "ana@smithlaw.com", expiresAt });
  });

  it("passes platformAdmin on to the simulated login", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    fetchMock.mockResolvedValueOnce(Response.json({
      token: "mock-jwt", user: { userId: "u_1", email: "ana@arca.test" }, expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    }));

    await signIn("ana@arca.test", { platformAdmin: true });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ email: "ana@arca.test", platformAdmin: true });
  });

  // Supabase Auth arrives after the demo: until then only the debug modes' simulated login exists.
  it.each([undefined, "production"])("is not configured when the mode is %s: no request, no session", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);

    await expect(signIn("ana@smithlaw.com")).resolves.toBe("not_configured");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(loadAppSession()).toBeNull();
  });
});

describe("signOut", () => {
  it("drops the session, the remembered organization and the pending claim", () => {
    const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt });
    rememberOrg("org_1");
    savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt });

    signOut();

    expect(loadAppSession()).toBeNull();
    expect(recallOrg()).toBeNull();
    expect(loadPendingClaim()).toBeNull();
  });
});
