// @vitest-environment jsdom
import type { DebugModeResponse, DebugScanState } from "@arca/contracts/debug";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDebugStore } from "@/lib/debug/store";
import StatePanel from "./StatePanel";

const navigation = vi.hoisted(() => ({ pathname: "/score", router: { push: () => undefined } }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams("scan=scan-1"),
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
  signalLlmModel: "mock",
  configured: { openai: false, apify: false, supabase: false },
};

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
  navigation.pathname = "/score";
});

describe("StatePanel", () => {
  it("shows the page's state, the back's mode, the scan and the token's times, never the email or token", async () => {
    const store = createDebugStore();
    store.publish("score", { tier: "GUARDED", cached: false });
    sessionStorage.setItem("arca.scan.scan-1", TOKEN);

    render(<StatePanel store={store} probe={{ kind: "ok", body: BACK }} apiUrl="http://api" />);

    expect(await screen.findByText(/2026-10-24T00:00:00\.000Z/)).toBeTruthy();
    expect(page()).toContain("2026-10-25T00:00:00.000Z");
    expect(page()).toContain('"tier": "GUARDED"');
    expect(page()).toContain('"storageBackend": "memory"');
    expect(page()).toContain("scan-1");
    expect(page()).not.toContain("@");
    expect(page()).not.toContain(TOKEN.split(".")[1]);
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
