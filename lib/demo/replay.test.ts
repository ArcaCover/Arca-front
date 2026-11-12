// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import recording from "./recording.json";
import { createReplay, DEMO_SCAN_MS, freshen, type RecordedExchange, type Recording } from "./replay";

const seed: Recording["seed"] = {
  organization: { id: "org-1", name: "Demo Org" },
  users: [
    { email: "owner@demo.example", role: "owner" },
    { email: "ops@demo.example", role: "platform_admin" },
  ],
};

const exchange = (method: string, path: string, body: unknown, extra: Partial<RecordedExchange> = {}): RecordedExchange => ({
  method,
  path,
  auth: null,
  requestBody: null,
  status: 200,
  contentType: "application/json",
  body,
  encoding: "json",
  ...extra,
});

// A two-chapter story: the organization is unpaid, then the payment closes the chapter and it is paid.
const story: Recording = {
  seed,
  scanning: { scanId: "sc_recorded", status: "RUNNING", elapsed: 1 },
  entries: [
    exchange("GET", "/orgs/1/analyses", { error: "payment_required" }, { status: 402, auth: "Bearer t" }),
    exchange("GET", "/orgs/1/analyses", { error: "payment_required" }, { status: 402, auth: "Bearer t" }),
    exchange("POST", "/__debug/billing/pay", { paid: true }),
    exchange("GET", "/orgs/1/analyses", { analyses: [] }, { auth: "Bearer t" }),
    exchange("POST", "/__debug/auth/login", { token: "owner" }, { requestBody: JSON.stringify({ email: "owner@demo.example" }) }),
    exchange(
      "POST",
      "/__debug/auth/login",
      { token: "ops" },
      { requestBody: JSON.stringify({ email: "ops@demo.example", platformAdmin: true }) },
    ),
    exchange("POST", "/scan", { scanId: "sc_1" }, { status: 202 }),
  ],
};

const analyses = { headers: { Authorization: "Bearer t" } };

describe("the demo's replay", () => {
  let now = 1_000_000;
  const clock = () => now;

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("answers a read with the state of the chapter reached, however many times it is asked", async () => {
    const answer = createReplay(story, clock);
    for (let visit = 0; visit < 4; visit++) expect(answer("/orgs/1/analyses", analyses).status).toBe(402);
    expect(answer("/__debug/billing/pay", { method: "POST" }).status).toBe(200);
    const paid = answer("/orgs/1/analyses", analyses);
    expect(paid.status).toBe(200);
    expect(await paid.json()).toEqual({ analyses: [] });
  });

  it("signs in any email, as the owner or as the ARCA admin when asked", async () => {
    const answer = createReplay(story, clock);
    const login = (body: object) => answer("/__debug/auth/login", { method: "POST", body: JSON.stringify(body) });
    expect(await login({ email: "someone@else.com" }).json()).toEqual({ token: "owner" });
    expect(await login({ email: "someone@else.com", platformAdmin: true }).json()).toEqual({ token: "ops" });
  });

  it("pretends the scan runs for a while, then answers with the recording", async () => {
    const answer = createReplay(
      { ...story, entries: [...story.entries, exchange("GET", "/scan/sc_1", { status: "completed" })] },
      clock,
    );
    answer("/scan", { method: "POST" });
    now += 1000;
    expect(await answer("/scan/sc_1").json()).toEqual({ scanId: "sc_1", status: "RUNNING", elapsed: 1000 });
    now += DEMO_SCAN_MS;
    expect(await answer("/scan/sc_1").json()).toEqual({ status: "completed" });
  });

  it("refuses what the recording does not know, saying nothing is saved", async () => {
    const answer = createReplay(story, clock);
    const write = answer("/orgs/1/invitations", { method: "POST" });
    expect(write.status).toBe(400);
    expect((await write.json()).message).toMatch(/nothing is saved/);
    expect(answer("/nowhere").status).toBe(404);
  });

  it("pushes every expiry a day ahead, so recorded tokens never expire", () => {
    const later = Date.now() + 23 * 60 * 60 * 1000;
    const body = freshen({ token: "t", expiresAt: "2020-01-01T00:00:00.000Z", nested: [{ expiresAt: "2020-01-01" }] }) as {
      expiresAt: string;
      nested: { expiresAt: string }[];
    };
    expect(Date.parse(body.expiresAt)).toBeGreaterThan(later);
    expect(Date.parse(body.nested[0].expiresAt)).toBeGreaterThan(later);
  });

  it("is built from a recording that covers the funnel and every role", () => {
    const data = recording as unknown as Recording;
    const paths = new Set(data.entries.map(entry => `${entry.method} ${entry.path.replace(/\/(sc|as)_[0-9a-f]+/, "/:id")}`));
    for (const route of ["POST /scan", "POST /claims", "POST /orgs", "POST /__debug/billing/pay", "GET /me"]) {
      expect(paths.has(route), route).toBe(true);
    }
    expect(new Set(data.seed.users.map(user => user.role))).toEqual(
      new Set(["owner", "admin", "member", "viewer", "platform_admin"]),
    );
    // Every recorded answer is a success: a failure in the recording would show up as a broken page in the demo.
    expect(data.entries.filter(entry => entry.status >= 400 && entry.status !== 402)).toEqual([]);
  });
});
