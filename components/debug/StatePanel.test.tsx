// @vitest-environment jsdom
import type { DebugModeResponse, DebugScanState } from "@arca/contracts/debug";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDebugStore } from "@/lib/debug/store";
import StatePanel from "./StatePanel";

vi.mock("next/navigation", () => ({
  usePathname: () => "/score",
  useSearchParams: () => new URLSearchParams("scan=scan-1"),
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
});
