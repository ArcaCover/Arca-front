// @vitest-environment jsdom
import type { DebugSeedResponse } from "@arca/contracts/debug";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadAppSession, loadPendingClaim, recallOrg, rememberOrg, saveAppSession, savePendingClaim } from "@/lib/app/session";
import { setShowForbidden, showForbidden, subscribeShowForbidden } from "@/lib/debug/bridge";
import { createDebugStore } from "@/lib/debug/store";
import RoleControls from "./RoleControls";
import StatePanel from "./StatePanel";

// DN-11 §6.4: the debug panel's webapp block. It seeds the mock back's demo organization, signs in as one of its users
// by role, and flips the switch that shows forbidden actions again. Everything goes through the real debug routes.
const navigation = vi.hoisted(() => ({ pathname: "/app", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

const SWITCH_KEY = "arca.debug.showForbidden";
const future = () => new Date(Date.now() + 3_600_000).toISOString();

const SEEDED: DebugSeedResponse = {
  organization: { id: "org_demo", name: "Robust Law (demo)" },
  users: [
    { email: "owner@demo.arca.example", role: "owner" },
    { email: "admin@demo.arca.example", role: "admin" },
    { email: "member@demo.arca.example", role: "member" },
    { email: "viewer@demo.arca.example", role: "viewer" },
    { email: "ops@demo.arca.example", role: "platform_admin" },
  ],
};

// What the mock back answers: the seed, and the simulated login for any email.
let seeded: DebugSeedResponse;
let seedStatus: number;
let loginStatus: number;
const fetcher = vi.fn<typeof fetch>(async (input, init) => {
  const url = String(input);
  if (url.endsWith("/__debug/seed")) {
    if (seedStatus !== 200) return Response.json({ error: "timeout", message: "The demo seed took too long" }, { status: seedStatus });
    return Response.json(seeded);
  }
  if (url.endsWith("/__debug/auth/login")) {
    if (loginStatus !== 200) return Response.json({ error: "invalid_request", message: "A valid email is required" }, { status: loginStatus });
    const { email } = JSON.parse(String(init?.body)) as { email: string };
    return Response.json({ token: `token-${email.split("@")[0]}`, user: { id: "u_demo", email }, expiresAt: future() });
  }
  return Response.json({ error: "not_found", message: "Not found" }, { status: 404 });
});
const assign = vi.fn();

const sent = () =>
  fetcher.mock.calls.map(([url, init]) => ({
    request: `${init?.method} ${String(url)}`,
    debugHeader: new Headers(init?.headers).get("X-Arca-Debug"),
    authorization: new Headers(init?.headers).get("Authorization"),
    body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
  }));
const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });
const page = () => document.body.textContent ?? "";

/** Someone else is signed in on this browser, in another organization, with a claim pending. */
function previousUser() {
  saveAppSession({ token: "old-token", email: "someone@firm.example", expiresAt: future() });
  rememberOrg("org_other");
  savePendingClaim({ claimId: "cl_old", email: "someone@firm.example", expiresAt: future() });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "mock");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("location", { assign });
  seeded = SEEDED;
  seedStatus = 200;
  loginStatus = 200;
});

afterEach(() => {
  cleanup();
  fetcher.mockClear();
  assign.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  navigation.pathname = "/app";
  navigation.search = "";
});

describe("the debug panel's webapp block", () => {
  const panel = () => render(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api.test" />);

  it.each(["/app", "/app/login", "/app/members", "/app/admin"])("shows on %s in mock", pathname => {
    navigation.pathname = pathname;
    panel();

    expect(button("Seed demo organization")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Show forbidden actions" })).toBeTruthy();
  });

  it("stays out of the funnel's pages", () => {
    navigation.pathname = "/score";
    panel();

    expect(screen.queryByRole("button", { name: "Seed demo organization" })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  // The live-debug back answers 501 to the webapp; a production build never loads the panel at all.
  it.each([["live-debug"], [undefined]])("is not rendered when the mode is %s", mode => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", mode);
    panel();

    expect(screen.queryByRole("button", { name: "Seed demo organization" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Sign in as/ })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(page()).not.toContain("Show forbidden actions");
  });
});

describe("RoleControls", () => {
  it("names each role on its button and never shows a seeded user's email", async () => {
    render(<RoleControls />);

    expect(screen.getAllByRole("button", { name: /^Sign in as/ }).map(each => each.textContent)).toEqual([
      "Sign in as owner",
      "Sign in as admin",
      "Sign in as member",
      "Sign in as viewer",
      "Sign in as ARCA admin",
    ]);

    await userEvent.click(button("Seed demo organization"));

    expect(await screen.findByText("Robust Law (demo) is ready, with: owner, admin, member, viewer, ARCA admin")).toBeTruthy();
    expect(page()).not.toContain("@");
  });

  it("seeds through the debug route with the debug header and no session, and signs no one in", async () => {
    previousUser();
    let answer: (response: Response) => void = () => undefined;
    fetcher.mockImplementationOnce(() => new Promise(resolve => (answer = resolve)));
    render(<RoleControls />);

    await userEvent.click(button("Seed demo organization"));

    // A first seed runs a whole scan and assessment: the panel says so, and holds every button meanwhile.
    expect(page()).toContain("Seeding: the mock back runs a scan and an assessment first, up to a minute");
    expect(button("Seed demo organization").disabled).toBe(true);
    expect(button("Sign in as owner").disabled).toBe(true);
    answer(Response.json(SEEDED));
    await screen.findByText(/is ready/);

    expect(sent()).toEqual([{ request: "POST http://api.test/__debug/seed", debugHeader: "1", authorization: null, body: undefined }]);
    expect(button("Seed demo organization").disabled).toBe(false);
    expect(loadAppSession()?.token).toBe("old-token");
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    ["owner", "owner@demo.arca.example", "/app", { email: "owner@demo.arca.example" }],
    ["admin", "admin@demo.arca.example", "/app", { email: "admin@demo.arca.example" }],
    ["member", "member@demo.arca.example", "/app", { email: "member@demo.arca.example" }],
    ["viewer", "viewer@demo.arca.example", "/app", { email: "viewer@demo.arca.example" }],
    // The ARCA admin also asks the mock login for the platform grant, so the button does not rest on the seed's alone.
    ["ARCA admin", "ops@demo.arca.example", "/app/admin", { email: "ops@demo.arca.example", platformAdmin: true }],
  ])("Sign in as %s signs the previous user out, signs in as the seeded user and loads %s", async (who, email, home, login) => {
    previousUser();
    render(<RoleControls />);

    await userEvent.click(button(`Sign in as ${who}`));

    await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith(home));
    expect(sent()).toEqual([
      { request: "POST http://api.test/__debug/seed", debugHeader: "1", authorization: null, body: undefined },
      { request: "POST http://api.test/__debug/auth/login", debugHeader: "1", authorization: null, body: login },
    ]);
    expect(loadAppSession()).toEqual({ token: `token-${email.split("@")[0]}`, email, expiresAt: expect.any(String) });
    // Nothing of the previous user stays: their organization and their claim went with signOut().
    expect(loadPendingClaim()).toBeNull();
    // The seeded organization opens first for its members; the ARCA admin belongs to none.
    expect(recallOrg()).toBe(who === "ARCA admin" ? null : "org_demo");
    expect(page()).not.toContain("@");
  });

  it("keeps the current user signed in when the seed fails, and says what the back answered", async () => {
    previousUser();
    seedStatus = 504;
    render(<RoleControls />);

    await userEvent.click(button("Sign in as member"));

    expect(await screen.findByText("The demo seed took too long")).toBeTruthy();
    expect(sent().map(call => call.request)).toEqual(["POST http://api.test/__debug/seed"]);
    expect(loadAppSession()?.token).toBe("old-token");
    expect(recallOrg()).toBe("org_other");
    expect(assign).not.toHaveBeenCalled();
    expect(button("Sign in as member").disabled).toBe(false);
  });

  it("keeps the current user signed in when the mock login fails", async () => {
    previousUser();
    loginStatus = 400;
    render(<RoleControls />);

    await userEvent.click(button("Sign in as viewer"));

    expect(await screen.findByText("A valid email is required")).toBeTruthy();
    expect(loadAppSession()?.token).toBe("old-token");
    expect(loadPendingClaim()?.claimId).toBe("cl_old");
    expect(assign).not.toHaveBeenCalled();
  });

  // The seed hands back the organization as the demo left it, so a role may have no one in it any more.
  it("says so when the demo organization has no one with that role, and signs no one in", async () => {
    previousUser();
    seeded = { ...SEEDED, users: SEEDED.users.filter(user => user.role !== "viewer") };
    render(<RoleControls />);

    await userEvent.click(button("Sign in as viewer"));

    expect(await screen.findByText("The demo organization has no viewer now")).toBeTruthy();
    expect(sent().map(call => call.request)).toEqual(["POST http://api.test/__debug/seed"]);
    expect(loadAppSession()?.token).toBe("old-token");
    expect(assign).not.toHaveBeenCalled();
  });

  it("flips the forbidden-actions switch through the bridge, which stores it in this tab and tells every page", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeShowForbidden(listener);
    render(<RoleControls />);
    const toggle = screen.getByRole<HTMLInputElement>("switch", { name: "Show forbidden actions" });
    expect(toggle.checked).toBe(false);

    await userEvent.click(toggle);

    expect(sessionStorage.getItem(SWITCH_KEY)).toBe("1");
    expect(showForbidden()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(toggle.checked).toBe(true);

    await userEvent.click(toggle);

    expect(sessionStorage.getItem(SWITCH_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(toggle.checked).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("shows the switch as this tab holds it, and follows it when it changes elsewhere", () => {
    sessionStorage.setItem(SWITCH_KEY, "1");
    render(<RoleControls />);
    const toggle = screen.getByRole<HTMLInputElement>("switch", { name: "Show forbidden actions" });
    expect(toggle.checked).toBe(true);

    act(() => setShowForbidden(false));

    expect(toggle.checked).toBe(false);
  });
});
