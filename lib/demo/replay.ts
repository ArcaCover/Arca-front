// The demo's stand-in for the API (see lib/arca-mode.ts): it answers in the browser from recording.json, which
// scripts/demo-record.mjs captures from the mock back. Nothing leaves the tab and nothing is saved anywhere.
//
// Replaying the calls in recorded order would break as soon as someone visits pages in another order, so the recording is
// read as a story in chapters. Every write (start a scan, save an answer, create the organization, pay…) closes a
// chapter. A read answers with what the back said last within the chapter the visitor has reached; a write the
// recording knows moves the visitor to the chapter after it. Visiting a page twice, or in any order, then shows the same
// state the mock back would have shown at that point of the story.
import type { AnswerValue } from "@arca/contracts";

import recording from "./recording.json";

export type RecordedExchange = {
  method: string;
  path: string;
  auth: string | null;
  requestBody: string | null;
  status: number;
  contentType: string;
  headers?: Record<string, string>;
  body: unknown;
  encoding: "json" | "base64";
};

/**
 * One scenario of the debug panel, scanned once by the recorder apart from the story: a preset of injected faults
 * (`scenario`) or a mock firm (`domain`). Its exchanges are the scan's start and its last poll.
 */
export type DemoScenario = {
  label: string;
  kind: "preset" | "firm";
  domain: string;
  scenario: Record<string, unknown> | null;
  exchanges: RecordedExchange[];
};

export type Recording = {
  seed: { organization: { id: string; name: string }; users: { email: string; role: string }[] };
  scanning: { scanId: string; status: string; elapsed: number };
  scenarios?: Record<string, DemoScenario>;
  entries: RecordedExchange[];
};

type Chaptered = { chapter: number; exchange: RecordedExchange };

const CHAPTER_KEY = "arca.demo.chapter";
const SCAN_STARTED_KEY = "arca.demo.scanStartedAt";
/** Which scans of this tab are scenario scans, by scan id: their polls come from the scenario, not from the story. */
const SCENARIO_SCANS_KEY = "arca.demo.scenarioScans";
/** How long a scan pretends to run, so the scanning screen shows. */
export const DEMO_SCAN_MS = 7000;
/** A small wait on every answer, so loading states show the way they would against the real API. */
const LATENCY_MS = 250;

const LOGIN_PATH = "/__debug/auth/login";
// Signing in and asking for the demo organization change nothing in the story: they are reads in disguise.
const isWrite = (method: string, path: string) =>
  method !== "GET" && path !== LOGIN_PATH && path !== "/__debug/seed";

function loginKey(requestBody: string | null): string {
  try {
    const { email, platformAdmin } = JSON.parse(requestBody ?? "{}") as { email?: string; platformAdmin?: boolean };
    return `${String(email ?? "").toLowerCase()}|${platformAdmin ? "admin" : ""}`;
  } catch {
    return "|";
  }
}

/** Who asks and for what. The query string counts; the body only for sign-in, where it says who signs in. */
export function exchangeKey(method: string, path: string, auth: string | null, requestBody: string | null): string {
  const base = `${method} ${path} ${auth ?? ""}`;
  return path === LOGIN_PATH ? `${base} ${loginKey(requestBody)}` : base;
}

export function indexRecording(entries: RecordedExchange[]) {
  const byKey = new Map<string, Chaptered[]>();
  // The same call regardless of who made it: the fallback when a token the recording never saw asks.
  const byRoute = new Map<string, Chaptered[]>();
  let chapter = 0;
  for (const exchange of entries) {
    const item = { chapter, exchange };
    const key = exchangeKey(exchange.method, exchange.path, exchange.auth, exchange.requestBody);
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
    const route = `${exchange.method} ${exchange.path}`;
    byRoute.set(route, [...(byRoute.get(route) ?? []), item]);
    if (isWrite(exchange.method, exchange.path)) chapter += 1;
    // A saved answer answers with the whole assessment as it now stands. The recorder never reads the assessment again
    // before the review, so that view is also the read of the chapter it opens: a reload mid-questionnaire, or the debug
    // panel's Auto-answer, shows the answers saved so far instead of the empty assessment.
    const saved = /^\/assessment\/([^/]+)\/answers\/[^/]+$/.exec(exchange.path);
    if (saved && exchange.method === "PUT" && exchange.status === 200) {
      const readPath = `/assessment/${saved[1]}`;
      const read = { chapter, exchange: { ...exchange, method: "GET", path: readPath, requestBody: null } };
      const readKey = exchangeKey("GET", readPath, exchange.auth, null);
      byKey.set(readKey, [...(byKey.get(readKey) ?? []), read]);
      byRoute.set(`GET ${readPath}`, [...(byRoute.get(`GET ${readPath}`) ?? []), read]);
    }
  }
  return { byKey, byRoute };
}

/** A read: the last answer within the chapter reached, or the first one if the visitor has not got that far yet. */
export function pickRead(candidates: Chaptered[], chapter: number): Chaptered {
  const reached = candidates.filter(item => item.chapter <= chapter);
  return reached.length > 0 ? reached[reached.length - 1] : candidates[0];
}

/** A write: the first one not behind the visitor, so going through the funnel again replays it from the start. */
export function pickWrite(candidates: Chaptered[], chapter: number): Chaptered {
  return candidates.find(item => item.chapter >= chapter) ?? candidates[0];
}

// Every expiry is pushed a day ahead of now: the recording's tokens would otherwise expire a day after it was made.
export function freshen(body: unknown): unknown {
  const ahead = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return JSON.parse(JSON.stringify(body), (key, value) => (key === "expiresAt" && typeof value === "string" ? ahead : value));
}

function readNumber(key: string): number {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Without storage the story starts over on every page load, which is still a working demo.
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function toResponse(exchange: RecordedExchange): Response {
  const headers = { "Content-Type": exchange.contentType, ...exchange.headers };
  if (exchange.encoding === "base64") {
    const bytes = Uint8Array.from(atob(String(exchange.body)), char => char.charCodeAt(0));
    return new Response(bytes, { status: exchange.status, headers });
  }
  return new Response(JSON.stringify(freshen(exchange.body)), { status: exchange.status, headers });
}

function headerOf(init: RequestInit, name: string): string | null {
  const headers = new Headers(init.headers);
  return headers.get(name);
}

// The header the debug panel's scenario rides in (DEBUG_SCENARIO_HEADER of @arca/contracts/debug, which only the debug
// modules may import). Both sides are complete scenarios, parsed with their defaults, so keys in one order compare them.
const SCENARIO_HEADER = "X-Arca-Debug-Scenario";
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sorted(item)]));
  }
  return value;
}
const canonical = (scenario: unknown) => (scenario && typeof scenario === "object" ? JSON.stringify(sorted(scenario)) : null);
const bareDomain = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

/**
 * The scenario a scan start asks for: the panel's preset, which the scan carries in its header, or else the mock firm its
 * website names. A combination nobody recorded asks for none, and the scan replays the story's firm.
 */
export function pickScenario(data: Recording, scenarioHeader: string | null, requestBody: string | null): string | null {
  const scenarios = Object.entries(data.scenarios ?? {});
  if (scenarioHeader) {
    let wanted: string | null = null;
    try {
      wanted = canonical(JSON.parse(scenarioHeader));
    } catch {
      wanted = null;
    }
    const preset = scenarios.find(([, item]) => item.kind === "preset" && wanted !== null && canonical(item.scenario) === wanted);
    if (preset) return preset[0];
  }
  let domain = "";
  try {
    domain = bareDomain((JSON.parse(requestBody ?? "{}") as { domain?: unknown }).domain);
  } catch {
    domain = "";
  }
  return scenarios.find(([, item]) => item.kind === "firm" && item.domain === domain)?.[0] ?? null;
}

function scenarioScans(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(SCENARIO_SCANS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function rememberScenarioScan(scanId: string, key: string): void {
  try {
    sessionStorage.setItem(SCENARIO_SCANS_KEY, JSON.stringify({ ...scenarioScans(), [scanId]: key }));
  } catch {
    // Without storage the scenario's polls fall back to the story's firm.
  }
}

export function createReplay(data: Recording, clock: () => number = Date.now) {
  const { byKey, byRoute } = indexRecording(data.entries);
  const owner = data.seed.users.find(user => user.role === "owner")?.email ?? "";
  const platformAdmin = data.seed.users.find(user => user.role === "platform_admin")?.email ?? "";

  return function answer(path: string, init: RequestInit = {}): Response {
    const method = (init.method ?? "GET").toUpperCase();
    const auth = headerOf(init, "Authorization");
    const requestBody = typeof init.body === "string" ? init.body : null;
    const chapter = readNumber(CHAPTER_KEY);

    // The scan pretends to run for a few seconds: the scanning screen is part of what the demo shows.
    if (method === "POST" && path === "/scan") {
      writeNumber(SCAN_STARTED_KEY, clock());
      // A scenario scan stands apart from the story: it moves no chapter, and its polls come from the scenario.
      const key = pickScenario(data, headerOf(init, SCENARIO_HEADER), requestBody);
      const start = key ? data.scenarios?.[key]?.exchanges[0] : undefined;
      if (key && start) {
        const scanId = (start.body as { scanId?: string } | null)?.scanId;
        if (scanId) rememberScenarioScan(scanId, key);
        return toResponse(start);
      }
    }
    const scan = /^\/scan\/([^/]+)$/.exec(path);
    if (method === "GET" && scan) {
      const scanId = decodeURIComponent(scan[1]);
      const elapsed = clock() - readNumber(SCAN_STARTED_KEY);
      if (elapsed < DEMO_SCAN_MS) return json(200, { ...data.scanning, scanId, elapsed });
      const key = scenarioScans()[scanId];
      const last = key ? data.scenarios?.[key]?.exchanges.at(-1) : undefined;
      if (last && last.method === "GET") return toResponse(last);
    }

    let candidates = byKey.get(exchangeKey(method, path, auth, requestBody));
    // Any email signs in: an unknown one becomes the demo organization's owner, or its ARCA admin when asked for.
    if (!candidates && path === LOGIN_PATH) {
      const wantsAdmin = loginKey(requestBody).endsWith("|admin");
      const body = JSON.stringify(wantsAdmin ? { email: platformAdmin, platformAdmin: true } : { email: owner });
      candidates = byKey.get(exchangeKey(method, path, auth, body));
    }
    candidates ??= byRoute.get(`${method} ${path}`);

    if (!candidates) {
      return method === "GET"
        ? json(404, { error: "not_found", message: "This page has no sample data in the demo." })
        : json(400, { error: "invalid_request", message: "Not available in the demo: nothing is saved here." });
    }
    if (isWrite(method, path)) {
      const chosen = pickWrite(candidates, chapter);
      writeNumber(CHAPTER_KEY, chosen.chapter + 1);
      return toResponse(chosen.exchange);
    }
    return toResponse(pickRead(candidates, chapter).exchange);
  };
}

let replay: ReturnType<typeof createReplay> | null = null;

/** What lib/api/client.ts calls instead of fetch in demo mode. */
export async function demoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  replay ??= createReplay(recording as unknown as Recording);
  await new Promise(resolve => setTimeout(resolve, LATENCY_MS));
  return replay(path, init);
}

/** The demo bar's "Start over": the story goes back to its first chapter. */
export function resetDemoStory(): void {
  writeNumber(CHAPTER_KEY, 0);
  writeNumber(SCAN_STARTED_KEY, 0);
  try {
    sessionStorage.removeItem(SCENARIO_SCANS_KEY);
  } catch {
    // Nothing kept, nothing to forget.
  }
}

/** The scenarios the debug panel can pick in the demo, as the recording holds them. */
export function demoScenarios(data: Recording = recording as unknown as Recording) {
  return Object.entries(data.scenarios ?? {}).map(([key, item]) => ({ key, label: item.label, kind: item.kind, domain: item.domain,
    scenario: item.scenario }));
}

/** The answer the recording saved for a question, so the panel's Auto-answer walks the recorded path. */
export function recordedAnswer(questionId: string, data: Recording = recording as unknown as Recording): AnswerValue | null {
  const suffix = `/answers/${encodeURIComponent(questionId)}`;
  const saved = data.entries.find(entry => entry.method === "PUT" && entry.path.endsWith(suffix) && entry.requestBody);
  if (!saved?.requestBody) return null;
  try {
    return (JSON.parse(saved.requestBody) as { answer?: AnswerValue }).answer ?? null;
  } catch {
    return null;
  }
}
