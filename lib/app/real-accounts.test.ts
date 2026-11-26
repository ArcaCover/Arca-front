// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/lib/test-fixtures/supabase";

import { realAccounts } from "./accounts";
import { confirmLink, requestCode, safeNext, signOut, verifyCode } from "./auth";
import { deleteAccount, enroll, getMe } from "./client";
import { EnrollResponse } from "./enroll-contract";
import {
  currentAppSession, loadPendingClaim, recallOrg, rememberOrg, saveAppSession, savePendingClaim, watchSessionEnd,
} from "./session";

// DN-13 §4.3 and §8.1: with the real accounts, the session is the Supabase client's, the API gets its access token as the
// Bearer, and signing in is a 6-digit code (or the fallback link) for an email the back enrolled.

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => supabase.current }));

let fake: FakeSupabase;
const fetchMock = vi.fn<typeof fetch>();
const future = () => new Date(Date.now() + 3_600_000).toISOString();
const sent = (call = 0) => {
  const [url, init] = fetchMock.mock.calls[call] ?? [];
  return { url: String(url), method: init?.method ?? "GET", headers: new Headers(init?.headers), body: init?.body };
};

function real() {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "production");
  vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", "true");
}

beforeEach(() => {
  fake = createFakeSupabase();
  supabase.current = fake;
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", undefined);
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("realAccounts", () => {
  it.each<[string | undefined, string | undefined, boolean]>([
    // Production hides the webapp until the flag says the back is on (DN-13 §7.6 step 4).
    [undefined, undefined, false],
    ["production", undefined, false],
    ["production", "false", false],
    ["production", "true", true],
    // live-debug is simulated by default, like its back; the flag asks for the back's WEBAPP_PROVIDERS=real.
    ["live-debug", undefined, false],
    ["live-debug", "true", true],
    // mock never calls a real service (DN-10 §2), whatever the flag says.
    ["mock", "true", false],
    ["mock", undefined, false],
  ])("mode %s with NEXT_PUBLIC_WEBAPP_ENABLED=%s → %s", (mode, flag, expected) => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", flag);
    expect(realAccounts()).toBe(expected);
  });
});

describe("currentAppSession", () => {
  it("is the Supabase session's access token and email with the real accounts, and never the simulated storage", async () => {
    real();
    saveAppSession({ token: "mock-jwt", email: "old@smithlaw.com", expiresAt: future() });
    await expect(currentAppSession()).resolves.toBeNull();

    fake.signedInAs("ana@smithlaw.com");
    await expect(currentAppSession()).resolves.toEqual({ token: "jwt-ana@smithlaw.com", email: "ana@smithlaw.com" });
  });

  it("reads the session at each call, so a refreshed token is the one that is sent", async () => {
    real();
    fake.signedInAs("ana@smithlaw.com");
    await currentAppSession();
    await currentAppSession();
    expect(fake.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it("is null when the client fails to read or refresh it", async () => {
    real();
    fake.auth.getSession.mockRejectedValueOnce(new Error("offline"));
    await expect(currentAppSession()).resolves.toBeNull();
  });

  it.each(["mock", "live-debug", undefined])("is the simulated session in mode %s, without touching Supabase", async mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    saveAppSession({ token: "mock-jwt", email: "ana@smithlaw.com", expiresAt: future() });
    await expect(currentAppSession()).resolves.toEqual({ token: "mock-jwt", email: "ana@smithlaw.com" });
    expect(fake.auth.getSession).not.toHaveBeenCalled();
  });
});

describe("watchSessionEnd", () => {
  it("calls back once the client says the session ended, and stops after the unsubscribe", async () => {
    real();
    const ended = vi.fn();
    const stop = watchSessionEnd(ended);
    fake.endSession();
    await vi.waitFor(() => expect(ended).toHaveBeenCalledTimes(1));
    stop();
    fake.endSession();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it("ignores the other events", async () => {
    real();
    const ended = vi.fn();
    watchSessionEnd(ended);
    fake.acceptCode("ana@smithlaw.com", "123456");
    await verifyCode("ana@smithlaw.com", "123456");
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(ended).not.toHaveBeenCalled();
  });

  it("subscribes to nothing with the simulated accounts", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    watchSessionEnd(() => {})();
    expect(fake.auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});

describe("requestCode", () => {
  beforeEach(() => {
    real();
  });

  it("asks Supabase for a code without ever creating a user, and points the fallback link at the confirm page", async () => {
    await expect(requestCode("ana@smithlaw.com", "/app/signup?claim=cl_1")).resolves.toBe(true);
    expect(fake.auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "ana@smithlaw.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=%2Fapp%2Fsignup%3Fclaim%3Dcl_1`,
      },
    });
  });

  it("is false when Supabase refuses, whatever the reason, and when it cannot be reached", async () => {
    fake.auth.signInWithOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: "Signups not allowed for otp", status: 422 } });
    await expect(requestCode("nobody@smithlaw.com", "/app")).resolves.toBe(false);
    fake.auth.signInWithOtp.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(requestCode("ana@smithlaw.com", "/app")).resolves.toBe(false);
  });
});

describe("verifyCode and confirmLink", () => {
  beforeEach(() => {
    real();
  });

  it("verifies the 6-digit code as an email OTP and leaves the session in the client", async () => {
    fake.acceptCode("ana@smithlaw.com", "123456");
    await expect(verifyCode("ana@smithlaw.com", "654321")).resolves.toBe(false);
    await expect(verifyCode("ana@smithlaw.com", "123456")).resolves.toBe(true);
    expect(fake.auth.verifyOtp).toHaveBeenLastCalledWith({ email: "ana@smithlaw.com", token: "123456", type: "email" });
    await expect(currentAppSession()).resolves.toEqual({ token: "jwt-ana@smithlaw.com", email: "ana@smithlaw.com" });
  });

  it("verifies the fallback link by its token hash, which needs no PKCE verifier and so works on another device", async () => {
    fake.acceptLink("hash_1", "ana@smithlaw.com");
    await expect(confirmLink("hash_2")).resolves.toBe(false);
    await expect(confirmLink("hash_1")).resolves.toBe(true);
    expect(fake.auth.verifyOtp).toHaveBeenLastCalledWith({ token_hash: "hash_1", type: "email" });
  });

  it("is false when the client cannot be reached", async () => {
    fake.auth.verifyOtp.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(verifyCode("ana@smithlaw.com", "123456")).resolves.toBe(false);
  });
});

describe("signOut with the real accounts", () => {
  it("signs out of this browser only, and forgets the organization and the pending claim", async () => {
    real();
    fake.signedInAs("ana@smithlaw.com");
    rememberOrg("org_1");
    savePendingClaim({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: future() });

    await signOut();

    expect(fake.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(fake.session()).toBeNull();
    expect(recallOrg()).toBeNull();
    expect(loadPendingClaim()).toBeNull();
  });

  it("still forgets what it keeps when Supabase cannot be reached", async () => {
    real();
    fake.auth.signOut.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    rememberOrg("org_1");
    await expect(signOut()).resolves.toBeUndefined();
    expect(recallOrg()).toBeNull();
  });

  it("does not touch Supabase with the simulated accounts", async () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
    await signOut();
    expect(fake.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("safeNext", () => {
  // The fallback link carries where to go after confirming (DN-13 §4.7); only a path of the app is followed.
  it.each([
    ["/app/signup?claim=cl_1", "/app/signup?claim=cl_1"],
    ["/app/invite/tok_1", "/app/invite/tok_1"],
    ["/app/", "/app/"],
    [null, "/app"],
    ["", "/app"],
    ["/app", "/app"],
    ["https://evil.example/app/", "/app"],
    ["//evil.example/app/", "/app"],
    ["/\\evil.example", "/app"],
    ["/application", "/app"],
    ["/score", "/app"],
    ["/app/\\evil", "/app"],
    ["javascript:alert(1)", "/app"],
  ])("%s → %s", (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });
});

describe("the API with the real accounts", () => {
  beforeEach(() => {
    real();
  });

  it("sends the Supabase access token as the Bearer", async () => {
    fake.signedInAs("ana@smithlaw.com");
    fetchMock.mockResolvedValueOnce(Response.json({ user: { id: "u_1", email: "ana@smithlaw.com" }, organizations: [], platformAdmin: false }));
    await getMe();
    expect(sent().headers.get("Authorization")).toBe("Bearer jwt-ana@smithlaw.com");
  });

  it("asks nothing without a session", async () => {
    await expect(getMe()).rejects.toMatchObject({ code: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("enroll", () => {
  it.each([
    [{ claimId: "cl_1" }],
    [{ invitationToken: "tok_1" }],
  ])("posts %o to the public route, with no Bearer, and returns the email the back enrolled", async request => {
    fetchMock.mockResolvedValueOnce(Response.json({ email: "ana@smithlaw.com" }));
    await expect(enroll(request)).resolves.toEqual({ email: "ana@smithlaw.com" });
    const call = sent();
    expect(call.url).toBe("http://api.test/auth/enroll");
    expect(call.method).toBe("POST");
    expect(call.headers.get("Authorization")).toBeNull();
    expect(call.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(call.body))).toEqual(request);
  });

  it.each([
    [410, "gone", "That link is no longer valid"],
    [400, "invalid_request", "Exactly one of claimId or invitationToken is required"],
    [503, "auth_unavailable", "Sign-in is temporarily unavailable"],
  ])("turns a %i into an ApiError %s", async (status, error, message) => {
    fetchMock.mockResolvedValueOnce(Response.json({ error, message }, { status }));
    await expect(enroll({ claimId: "cl_1" })).rejects.toMatchObject({ code: error, message });
  });

  it("keeps the Retry-After of a 429", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "rate_limited", message: "Too many requests" }, {
      status: 429, headers: { "Retry-After": "120" } }));
    await expect(enroll({ invitationToken: "tok_1" })).rejects.toMatchObject({ code: "rate_limited", retryAfter: 120 });
  });

  it("refuses an answer that is not the contract's", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ email: "ana@smithlaw.com", existed: true }));
    await expect(enroll({ claimId: "cl_1" })).rejects.toMatchObject({ code: "contract" });
  });
});

describe("deleteAccount", () => {
  it("sends DELETE /me with the session's Bearer and reads the 204", async () => {
    real();
    fake.signedInAs("ana@smithlaw.com");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(sent()).toMatchObject({ url: "http://api.test/me", method: "DELETE", body: undefined });
    expect(sent().headers.get("Authorization")).toBe("Bearer jwt-ana@smithlaw.com");
  });

  it.each([
    [409, "conflict"],
    [503, "auth_unavailable"],
    [401, "unauthorized"],
  ])("turns a %i into an ApiError %s", async (status, error) => {
    saveAppSession({ token: "mock-jwt", email: "ana@smithlaw.com", expiresAt: future() });
    fetchMock.mockResolvedValueOnce(Response.json({ error, message: "No" }, { status }));
    await expect(deleteAccount()).rejects.toMatchObject({ code: error });
  });
});

// DN-13 §7.6: the two shapes come with @arca/contracts 0.5.0; until then the front mirrors them.
describe("EnrollResponse (mirrored until contracts 0.5.0)", () => {
  it("reads an email and nothing else", () => {
    expect(EnrollResponse.parse({ email: "ana@smithlaw.com" })).toEqual({ email: "ana@smithlaw.com" });
  });

  it.each([
    [null], [{}], [{ email: 42 }], [{ email: "not an email" }], [{ email: "ana@smithlaw.com", userId: "u_1" }], [[]],
  ])("refuses %o", value => {
    expect(() => EnrollResponse.parse(value)).toThrow();
  });
});

describe("the tab's own sign-out", () => {
  // Whoever signs out here says where to go next (the login, or the home page after deleting the account).
  it("does not wake the watchers", async () => {
    real();
    fake.signedInAs("ana@smithlaw.com");
    const ended = vi.fn();
    watchSessionEnd(ended);
    await signOut();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(fake.session()).toBeNull();
    expect(ended).not.toHaveBeenCalled();
  });
});
