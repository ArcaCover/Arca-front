// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixtureResult } from "@/lib/api/fixture";

import {
  acceptInvitation,
  adminListDeletionRequests,
  adminListOrganizations,
  adminListPlans,
  adminReviewDeletion,
  adminUpdatePlan,
  attachAnalysis,
  checkout,
  createClaim,
  createOrg,
  getMe,
  getOrg,
  getPlans,
  invite,
  listAnalyses,
  listMembers,
  portal,
  removeMember,
  requestDeletion,
  revokeInvitation,
  setMemberRole,
} from "./client";
import { saveAppSession } from "./session";

const NOW = "2026-10-26T10:00:00.000Z";

const plan = { code: "monthly", name: "Monthly (example price)", amountCents: 49900, currency: "usd", interval: "month" };
const org = {
  id: "org_1", name: "Smith Law", domain: "smithlaw.com", billingStatus: "active", role: "owner",
  deletionPending: false, paidAccess: true,
};
const member = { userId: "u_2", email: "bo@smithlaw.com", role: "member", joinedAt: NOW };
const invitation = { id: "inv_1", email: "cy@smithlaw.com", role: "viewer", expiresAt: NOW, inviteUrl: "http://app.test/app/invite/tok" };
const deletion = {
  id: "del_1", orgId: "org_1", reason: "Closing the firm", status: "pending", requestedAt: NOW, reviewedAt: null, reviewNote: null,
};
const analysis = { scanId: "sc_fixture", domain: "smithlaw.com", scanStatus: "COMPLETED", claimedAt: NOW, layer1: fixtureResult(), assessment: null };

const fetchMock = vi.fn<typeof fetch>();
const sentRequest = (call = 0) => {
  const [url, init] = fetchMock.mock.calls[call] ?? [];
  return { url: String(url), method: init?.method ?? "GET", headers: new Headers(init?.headers), body: init?.body };
};
const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(Response.json(body, { status }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/");
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
  saveAppSession({ token: "app-token", email: "ana@smithlaw.com", expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// One row per route of the API: the verb, the path, the body it carries and what it parses the answer into.
describe("one function per route", () => {
  const routes: Array<{
    name: string;
    call: () => Promise<unknown>;
    method: string;
    path: string;
    body?: unknown;
    status?: number;
    reply: unknown;
  }> = [
    { name: "getMe", call: () => getMe(), method: "GET", path: "/me",
      reply: { user: { id: "u_1", email: "ana@smithlaw.com" }, organizations: [org], platformAdmin: false } },
    { name: "createOrg", call: () => createOrg("Smith Law", "cl_1"), method: "POST", path: "/orgs",
      body: { name: "Smith Law", claimId: "cl_1" }, status: 201, reply: org },
    { name: "getOrg", call: () => getOrg("org_1"), method: "GET", path: "/orgs/org_1", reply: org },
    { name: "listAnalyses", call: () => listAnalyses("org_1"), method: "GET", path: "/orgs/org_1/analyses", reply: [analysis] },
    { name: "attachAnalysis", call: () => attachAnalysis("org_1", "cl_2"), method: "POST", path: "/orgs/org_1/analyses",
      body: { claimId: "cl_2" }, status: 201, reply: analysis },
    { name: "listMembers", call: () => listMembers("org_1"), method: "GET", path: "/orgs/org_1/members",
      reply: { members: [member], invitations: [invitation] } },
    { name: "invite", call: () => invite("org_1", "cy@smithlaw.com", "viewer"), method: "POST", path: "/orgs/org_1/invitations",
      body: { email: "cy@smithlaw.com", role: "viewer" }, status: 201, reply: invitation },
    { name: "setMemberRole", call: () => setMemberRole("org_1", "u_2", "admin"), method: "PATCH", path: "/orgs/org_1/members/u_2",
      body: { role: "admin" }, reply: { ...member, role: "admin" } },
    { name: "acceptInvitation", call: () => acceptInvitation("tok"), method: "POST", path: "/invitations/tok/accept", reply: org },
    { name: "checkout", call: () => checkout("org_1", "monthly"), method: "POST", path: "/orgs/org_1/billing/checkout",
      body: { planCode: "monthly" }, reply: { url: "http://app.test/app/billing/mock-checkout?session=cs_1" } },
    { name: "portal", call: () => portal("org_1"), method: "POST", path: "/orgs/org_1/billing/portal",
      reply: { url: "http://app.test/app/billing" } },
    { name: "requestDeletion", call: () => requestDeletion("org_1", "Closing the firm"), method: "POST", path: "/orgs/org_1/deletion-request",
      body: { reason: "Closing the firm" }, status: 201, reply: deletion },
    { name: "adminListOrganizations", call: () => adminListOrganizations(), method: "GET", path: "/admin/organizations",
      reply: [{ id: "org_1", name: "Smith Law", billingStatus: "active", deleted: false, members: 2 }] },
    { name: "adminListDeletionRequests", call: () => adminListDeletionRequests(), method: "GET", path: "/admin/deletion-requests",
      reply: [deletion] },
    { name: "adminReviewDeletion (approve, with a note)", call: () => adminReviewDeletion("del_1", "approve", "Confirmed by phone"),
      method: "POST", path: "/admin/deletion-requests/del_1/approve", body: { note: "Confirmed by phone" },
      reply: { ...deletion, status: "approved" } },
    { name: "adminReviewDeletion (reject, no note)", call: () => adminReviewDeletion("del_1", "reject"),
      method: "POST", path: "/admin/deletion-requests/del_1/reject", body: {}, reply: { ...deletion, status: "rejected" } },
    { name: "adminListPlans", call: () => adminListPlans(), method: "GET", path: "/admin/plans", reply: [plan] },
    { name: "adminUpdatePlan", call: () => adminUpdatePlan("monthly", { amountCents: 59900 }), method: "PUT", path: "/admin/plans/monthly",
      body: { amountCents: 59900 }, reply: { ...plan, amountCents: 59900 } },
  ];

  it.each(routes)("$name sends the app session's Bearer to $method $path and parses the answer", async ({ call, method, path, body, status, reply }) => {
    answer(reply, status);

    await expect(call()).resolves.toEqual(reply);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = sentRequest();
    expect(request.url).toBe(`http://api.test${path}`);
    expect(request.method).toBe(method);
    expect(request.headers.get("Authorization")).toBe("Bearer app-token");
    if (body === undefined) expect(request.body).toBeUndefined();
    else {
      expect(JSON.parse(request.body as string)).toEqual(body);
      expect(request.headers.get("Content-Type")).toBe("application/json");
    }
  });

  it("removeMember and revokeInvitation answer 204 with no body", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(removeMember("org_1", "u_2")).resolves.toBeUndefined();
    await expect(revokeInvitation("org_1", "inv_1")).resolves.toBeUndefined();

    expect(sentRequest(0)).toMatchObject({ url: "http://api.test/orgs/org_1/members/u_2", method: "DELETE" });
    expect(sentRequest(1)).toMatchObject({ url: "http://api.test/orgs/org_1/invitations/inv_1", method: "DELETE" });
    expect(sentRequest(0).headers.get("Authorization")).toBe("Bearer app-token");
    expect(sentRequest(1).headers.get("Authorization")).toBe("Bearer app-token");
  });

  it("encodes what it puts in a path", async () => {
    answer(org);

    await getOrg("org/1?x=y");

    expect(sentRequest().url).toBe("http://api.test/orgs/org%2F1%3Fx%3Dy");
  });
});

// Two routes are public by design (DN-10 section 4.7): the plans, and the claim ticket, which the scan token in the body
// authorizes before the visitor has any account to sign in with.
describe("the public routes", () => {
  it("getPlans needs no session and sends no Authorization", async () => {
    localStorage.clear();
    answer([plan]);

    await expect(getPlans()).resolves.toEqual([plan]);

    expect(sentRequest()).toMatchObject({ url: "http://api.test/plans", method: "GET" });
    expect(sentRequest().headers.has("Authorization")).toBe(false);
  });

  it("createClaim carries the scan token in the body, with no session and no Authorization", async () => {
    localStorage.clear();
    const claim = { claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: NOW };
    answer(claim, 201);

    await expect(createClaim("scan-token")).resolves.toEqual(claim);

    const request = sentRequest();
    expect(request).toMatchObject({ url: "http://api.test/claims", method: "POST" });
    expect(JSON.parse(request.body as string)).toEqual({ scanToken: "scan-token" });
    expect(request.headers.has("Authorization")).toBe(false);
  });

  it("does not send the app session along either, even when there is one", async () => {
    answer({ claimId: "cl_1", email: "ana@smithlaw.com", expiresAt: NOW }, 201);

    await createClaim("scan-token");

    expect(sentRequest().headers.has("Authorization")).toBe(false);
  });
});

describe("without a session", () => {
  it("answers unauthorized without making a request", async () => {
    localStorage.clear();

    await expect(getMe()).rejects.toMatchObject({ name: "ApiError", code: "unauthorized" });
    await expect(createOrg("Smith Law", "cl_1")).rejects.toMatchObject({ code: "unauthorized" });
    await expect(removeMember("org_1", "u_2")).rejects.toMatchObject({ code: "unauthorized" });
    await expect(adminListPlans()).rejects.toMatchObject({ code: "unauthorized" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats an expired session as none", async () => {
    saveAppSession({ token: "old-token", email: "ana@smithlaw.com", expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(getMe()).rejects.toMatchObject({ code: "unauthorized" });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("failures", () => {
  it.each([
    [402, "payment_required"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [410, "gone"],
    [501, "not_configured"],
  ])("turns the API's %i into ApiError(%s)", async (status, code) => {
    answer({ error: code, message: "Refused by the API" }, status);

    const error = await getOrg("org_1").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ name: "ApiError", code, message: "Refused by the API" });
  });

  it("reaches a failure on a route that answers 204, too", async () => {
    answer({ error: "forbidden", message: "Not allowed" }, 403);

    await expect(removeMember("org_1", "u_2")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("answers a code it does not know as an internal error", async () => {
    answer({ error: "teapot", message: "No" }, 418);

    await expect(getMe()).rejects.toMatchObject({ code: "internal_error" });
  });

  it("answers a body outside the contract as a contract error", async () => {
    answer({ user: { id: "u_1" }, organizations: "none" });

    await expect(getMe()).rejects.toMatchObject({ name: "ApiError", code: "contract" });
  });

  it("answers a member list outside the contract as a contract error", async () => {
    answer({ members: [{ userId: "u_2" }], invitations: [] });
    await expect(listMembers("org_1")).rejects.toMatchObject({ code: "contract" });

    answer({ members: [member] });
    await expect(listMembers("org_1")).rejects.toMatchObject({ code: "contract" });

    answer(null);
    await expect(listMembers("org_1")).rejects.toMatchObject({ code: "contract" });
  });

  it("answers an unreachable API as a network error", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(getMe()).rejects.toMatchObject({ code: "network" });
  });
});
