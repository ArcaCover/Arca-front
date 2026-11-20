// @vitest-environment jsdom
import type { DebugScanState } from "@arca/contracts/debug";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DebugModeResponse } from "@/lib/debug/mode-contract";
import { createDebugStore } from "@/lib/debug/store";
import StatePanel from "./StatePanel";

const navigation = vi.hoisted(() => ({ pathname: "/score", search: "scan=scan-1", router: { push: () => undefined } }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => navigation.router,
}));

const ISSUED = 1_792_800_000;
const segment = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const TOKEN = [
  segment({ alg: "HS256" }),
  segment({ email: "partner@firm.example", sub: "scan-1", iat: ISSUED, exp: ISSUED + 86_400 }),
  "c2lnbmF0dXJl",
].join(".");

const BACK: DebugModeResponse = {
  mode: "mock",
  sourceMode: "mock",
  storageBackend: "memory",
  websiteEvidenceProvider: "mock",
  assessmentPlanner: "rules",
  signalLlmModel: null,
  inUse: { openai: false, apify: false, supabase: false },
  webapp: "simulated",
  billing: "simulated",
};
const REAL: DebugModeResponse = {
  ...BACK,
  mode: "live-debug",
  sourceMode: "live",
  storageBackend: "supabase",
  inUse: { openai: true, apify: true, supabase: true },
  webapp: "real",
  billing: "test",
};
const webappRow = () => screen.getByText("Webapp").nextElementSibling as HTMLElement;

// A reason scraped from a third-party site, written to look like markup.
const HOSTILE = '<img src=x onerror="alert(1)">';
const STATE: DebugScanState = {
  scanId: "scan-1",
  status: "PARTIAL",
  canonicalDomain: "firm.example",
  domainResolution: { status: "RESOLVED", canonicalDomain: "firm.example", source: "request", reason: null },
  createdAt: "2026-10-24T00:00:00.000Z",
  completedAt: "2026-10-24T00:00:04.000Z",
  durationMs: 4000,
  cached: false,
  storage: "memory",
  injected: false,
  scenario: null,
  sources: {
    website: { status: "ok", dataStatus: "PRESENT", durationMs: 1200 },
    bar: { status: "error", dataStatus: "UNKNOWN", durationMs: 900, reason: HOSTILE },
    avvo: { status: "ok", dataStatus: "EMPTY", durationMs: 800 },
  },
};

const page = () => document.body.textContent ?? "";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  navigation.pathname = "/score";
  navigation.search = "scan=scan-1";
});

describe("StatePanel", () => {
  it("shows the page's state, the back's mode, the scan and the token's times, never the email or token", async () => {
    const store = createDebugStore();
    store.publish("score", { scanId: "scan-1", tier: "GUARDED", cached: false });
    sessionStorage.setItem("arca.scan.scan-1", TOKEN);

    render(<StatePanel store={store} probe={{ kind: "ok", body: BACK }} apiUrl="http://api" />);

    expect(await screen.findByText(/2026-10-24T00:00:00\.000Z/)).toBeTruthy();
    expect(page()).toContain("2026-10-25T00:00:00.000Z");
    expect(page()).toContain('"tier": "GUARDED"');
    expect(page()).toContain('"storageBackend": "memory"');
    expect(page()).toContain('"websiteEvidenceProvider": "mock"');
    expect(page()).toContain('"signalLlmModel": null');
    expect(page()).toContain('"inUse": {');
    expect(page()).toContain("scan-1");
    expect(page()).not.toContain("@");
    expect(page()).not.toContain(TOKEN.split(".")[1]);
  });

  // DN-13 §8.4, T19: which webapp the back built, in words, from /__debug/mode.
  it("says the webapp is simulated, and that it lives in the back's memory", () => {
    render(<StatePanel store={createDebugStore()} probe={{ kind: "ok", body: BACK }} apiUrl="http://api" />);

    expect(webappRow().textContent).toContain("Webapp: simulated · billing simulated");
    expect(webappRow().textContent).toContain("reset when it restarts");
    expect(webappRow().textContent).not.toContain("4242");
    expect(webappRow().querySelector("a")).toBeNull();
  });

  it("on the real webapp, says Stripe test and how to pay and get the webhooks, linking to Stripe's docs", () => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", "true");
    render(<StatePanel store={createDebugStore()} probe={{ kind: "ok", body: REAL }} apiUrl="http://127.0.0.1:8091" />);

    expect(webappRow().textContent).toContain("Webapp: real · Stripe test");
    expect(webappRow().textContent).toContain("4242 4242 4242 4242");
    expect(webappRow().textContent).toContain("stripe listen --forward-to http://127.0.0.1:8091/billing/webhook");
    const links = [...webappRow().querySelectorAll("a")];
    expect(links.map(link => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Stripe test cards", "https://docs.stripe.com/testing#cards"],
      ["stripe listen", "https://docs.stripe.com/cli/listen"],
    ]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer");
    }
    expect(webappRow().querySelector(".text-rojo")).toBeNull();
  });

  it.each([
    { name: "a simulated build against the real back", env: undefined, body: REAL, says: "This front signs in with simulated accounts and the back runs real ones" },
    { name: "a real build against the simulated back", env: "true", body: { ...BACK, mode: "live-debug" } as DebugModeResponse,
      says: "This front signs in with real accounts and the back runs simulated ones" },
  ])("warns when front and back disagree on the accounts: $name", ({ env, body, says }) => {
    vi.stubEnv("NEXT_PUBLIC_ARCA_MODE", "live-debug");
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_ENABLED", env);
    render(<StatePanel store={createDebugStore()} probe={{ kind: "ok", body }} apiUrl="http://api" />);

    const warning = webappRow().querySelector(".text-rojo");
    expect(warning?.textContent).toContain(says);
    expect(warning?.textContent).toContain("NEXT_PUBLIC_WEBAPP_ENABLED");
  });

  it("does not guess the webapp of a back that reported no mode", () => {
    render(<StatePanel store={createDebugStore()} probe={{ kind: "absent" }} apiUrl="http://api" />);
    expect(webappRow().textContent).toBe("Unknown until the back reports its mode");
    cleanup();
    render(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api" />);
    expect(webappRow().textContent).toBe("Checking…");
  });

  it("fetches the internal state with the scan's token and shows third-party text as text", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(STATE)));
    vi.stubGlobal("fetch", fetcher);
    sessionStorage.setItem("arca.scan.scan-1", TOKEN);
    const { container } = render(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api" />);

    await userEvent.click(screen.getByRole("button", { name: "View internal state" }));

    expect(fetcher).toHaveBeenCalledWith(
      "http://api/__debug/scan/scan-1",
      expect.objectContaining({ headers: { Authorization: `Bearer ${TOKEN}` } }),
    );
    const json = await screen.findByText(/"canonicalDomain": "firm\.example"/);
    expect(json.tagName).toBe("PRE");
    expect(json.className).toBe("font-body whitespace-pre-wrap");
    expect(json.textContent).toContain(JSON.stringify(HOSTILE));
    expect(container.querySelector("img")).toBeNull();
  });

  it("says so when this tab holds no token for the scan", async () => {
    render(<StatePanel store={createDebugStore()} probe={{ kind: "absent" }} apiUrl="http://api" />);

    expect(await screen.findByText("No token stored for this scan")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "View internal state" }).disabled).toBe(true);
  });

  // Defence in depth (DN-09 §7): pages must never publish these, and if one ever does, the panel still hides them.
  it("never prints an email or a session token that a page published, and keeps the rest", () => {
    const store = createDebugStore();
    store.publish("score", {
      scanId: "scan-1",
      email: "partner@firm.example",
      lead: { Email: "office@firm.example", contact: "write to partner@firm.example" },
      sessionToken: TOKEN,
      header: `Bearer ${TOKEN}`,
      domain: "robust.arca.example",
      tier: "GUARDED",
    });

    render(<StatePanel store={store} probe={null} apiUrl="http://api" />);

    expect(page()).not.toContain("@");
    for (const segment of TOKEN.split(".")) expect(page()).not.toContain(segment);
    expect(page()).toContain('"domain": "robust.arca.example"');
    expect(page()).toContain('"tier": "GUARDED"');
    expect(page()).toContain('"header": "Bearer [token hidden]"');
  });

  // A page's state belongs to the scan it was published for. A failure path that publishes nothing must not leave the
  // previous scan's outcome on show under the new scan's id.
  it("shows nothing for a scan that has not published yet, rather than another scan's state", () => {
    const store = createDebugStore();
    store.publish("score", { scanId: "scan-0", status: "COMPLETED", cached: false });

    const { rerender } = render(<StatePanel store={store} probe={null} apiUrl="http://api" />);
    expect(page()).toContain("Nothing published for this scan yet");
    expect(page()).not.toContain("COMPLETED");

    act(() => store.publish("score", { scanId: "scan-1", status: "FAILED", cached: false }));
    rerender(<StatePanel store={store} probe={null} apiUrl="http://api" />);
    expect(page()).toContain('"status": "FAILED"');
    expect(page()).not.toContain("Nothing published for this scan yet");
  });

  // /quote has no scan in its URL: what it shows is the start it made, whichever scan that started.
  it("on a page without a scan in the URL, shows what the page last published", () => {
    navigation.pathname = "/quote";
    navigation.search = "";
    const store = createDebugStore();
    store.publish("quote", { scanId: "sc_9", lastError: null, response: { status: "RUNNING", cached: false }, sentScenario: null });

    render(<StatePanel store={store} probe={null} apiUrl="http://api" />);

    expect(page()).toContain('"scanId": "sc_9"');
    expect(page()).toContain("No scan in the URL");
  });

  it("mounts the scenario controls on /quote and the assessment controls on /assessment, and neither elsewhere", () => {
    const { rerender } = render(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api" />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Auto-answer" })).toBeNull();

    navigation.pathname = "/quote";
    rerender(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api" />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Auto-answer" })).toBeNull();

    navigation.pathname = "/assessment";
    rerender(<StatePanel store={createDebugStore()} probe={null} apiUrl="http://api" />);
    expect(screen.getByRole("button", { name: "Auto-answer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attest & complete" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
