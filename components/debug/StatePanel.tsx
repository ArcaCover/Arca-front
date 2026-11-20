"use client";

import { DebugScanState } from "@arca/contracts/debug";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { realAccounts } from "@/lib/app/accounts";
import { recallSession } from "@/lib/api/session";
import type { DebugSection } from "@/lib/debug/bridge";
import type { BackModeProbe } from "@/lib/debug/mode-check";
import type { DebugModeResponse } from "@/lib/debug/mode-contract";
import type { DebugStore } from "@/lib/debug/store";
import { tokenTimes, type TokenTimes } from "@/lib/debug/token";
import AssessmentControls from "./AssessmentControls";
import RoleControls from "./RoleControls";
import ScenarioControls from "./ScenarioControls";

// The state that pages keep invisible today (DN-09 §6.3). Everything is rendered as text, never as HTML: reasons and
// names come from third-party sites.
const SECTIONS: Record<string, DebugSection> = {
  "/quote": "quote",
  "/quote/scanning": "scanning",
  "/score": "score",
  "/assessment": "assessment",
  "/assessment/results": "results",
};

const BACK_MODE: Record<Exclude<BackModeProbe["kind"], "ok">, string> = {
  absent: "No debug mode: a production back, or one this front does not understand",
  unreachable: "Unreachable",
};

const ROWS = "grid gap-x-4 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)]";

// Defence in depth (DN-09 §7): pages publish neither, but whatever reaches the panel, it never prints an email or a
// session token. An `email` key is dropped; an address or a JWT (its header always encodes to "eyJ") inside any string
// is masked.
const EMAIL_KEY = /email/i;
const EMAIL_ADDRESS = /[^\s@"]+@[^\s@"]+\.[^\s@"]+/g;
const JWT = /eyJ[\w-]*\.[\w-]+\.[\w-]*/g;

function redact(key: string, value: unknown): unknown {
  if (EMAIL_KEY.test(key)) return undefined;
  if (typeof value !== "string") return value;
  return value.replace(JWT, "[token hidden]").replace(EMAIL_ADDRESS, "[email hidden]");
}

function Json({ value }: { value: unknown }) {
  return <pre className="font-body whitespace-pre-wrap">{JSON.stringify(value, redact, 2)}</pre>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

type Props = { store: DebugStore; probe: BackModeProbe | null; apiUrl: string; onScenarioChange?: () => void };

export default function StatePanel({ store, probe, apiUrl, onScenarioChange }: Props) {
  const pathname = usePathname();
  const scanId = useSearchParams().get("scan");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const section = SECTIONS[pathname];
  const last = section ? snapshot[section] : undefined;
  // Every page publishes the scan its state belongs to. With a scan in the URL, another scan's state is not shown: a
  // failure path that published nothing yet must not pass off the previous scan's outcome as this one's. /quote has no
  // scan in its URL, so it shows the start it made last.
  const published = last && (scanId === null || last.scanId === scanId) ? last : undefined;
  const empty = last ? "Nothing published for this scan yet" : "Nothing published yet";
  return (
    <section
      id="arca-debug-panel"
      aria-label="Debug state"
      className="max-h-[70vh] overflow-y-auto break-words border-b border-bruma bg-white px-4 py-3 font-body text-xs text-marino"
    >
      <dl className={ROWS}>
        <Row label="Page">{section ? `${pathname} (${section})` : `${pathname} (publishes no state)`}</Row>
        {section && (
          <Row label="Published state">{published ? <Json value={published} /> : empty}</Row>
        )}
        <Row label="Back mode">
          {probe === null ? "Checking…" : probe.kind === "ok" ? <Json value={probe.body} /> : BACK_MODE[probe.kind]}
        </Row>
        <Row label="Webapp">
          {probe === null ? (
            "Checking…"
          ) : probe.kind === "ok" ? (
            <Webapp back={probe.body} apiUrl={apiUrl} />
          ) : (
            "Unknown until the back reports its mode"
          )}
        </Row>
        <Row label="Scan">{scanId ?? "No scan in the URL"}</Row>
      </dl>
      {section === "quote" && <ScenarioControls apiUrl={apiUrl} onScenarioChange={onScenarioChange} />}
      {section === "assessment" && scanId && <AssessmentControls scanId={scanId} />}
      {/* DN-11 §6.4: on every private page, apart from SECTIONS, and in mock only. The live-debug back simulates the webapp
          but has no demo seed (it answers 404), so there are no seeded roles to sign in as. */}
      {process.env.NEXT_PUBLIC_ARCA_MODE === "mock" && pathname.startsWith("/app") && <RoleControls />}
      {/* Keyed by scan, so a new scan starts from a fresh token reading and no internal state from the last one. */}
      {scanId && <ScanDetails key={scanId} scanId={scanId} apiUrl={apiUrl} />}
    </section>
  );
}

const LINK = "font-semibold underline";

// DN-13 §8.4, T19: which webapp the back built and what bills it, as /__debug/mode says, next to what this build signs in with.
// The back answers with words only: no key, no prefix, no project URL.
function Webapp({ back, apiUrl }: { back: DebugModeResponse; apiUrl: string }) {
  const front = realAccounts() ? "real" : "simulated";
  return (
    <div className="grid gap-1">
      <p>{`Webapp: ${back.webapp} · ${back.billing === "test" ? "Stripe test" : "billing simulated"}`}</p>
      {back.webapp === "simulated" ? (
        <p>Accounts, organizations and payments live in the back&apos;s memory and reset when it restarts.</p>
      ) : (
        <p>Accounts sign in with Supabase Auth; organizations live in the back&apos;s Supabase project.</p>
      )}
      {back.billing === "test" && (
        <>
          <p>
            {"Pay with the test card 4242 4242 4242 4242, any future date and any CVC ("}
            <a className={LINK} href="https://docs.stripe.com/testing#cards" target="_blank" rel="noreferrer">
              Stripe test cards
            </a>
            {")."}
          </p>
          <p>
            {"Stripe's events reach this API only through "}
            <a className={LINK} href="https://docs.stripe.com/cli/listen" target="_blank" rel="noreferrer">
              stripe listen
            </a>
            {": "}
            <code className="font-body">{`stripe listen --forward-to ${apiUrl || "<API URL>"}/billing/webhook`}</code>
          </p>
        </>
      )}
      {front !== back.webapp && (
        <p className="text-rojo">
          {`This front signs in with ${front} accounts and the back runs ${back.webapp} ones, so sign-in fails: build the front `
            + `with NEXT_PUBLIC_WEBAPP_ENABLED=${back.webapp === "real"} or start the back with WEBAPP_PROVIDERS=${front}.`}
        </p>
      )}
    </div>
  );
}

type Token = { kind: "reading" } | { kind: "none" } | { kind: "unreadable" } | ({ kind: "read" } & TokenTimes);
type Internal =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; state: DebugScanState };

function ScanDetails({ scanId, apiUrl }: { scanId: string; apiUrl: string }) {
  const [token, setToken] = useState<Token>({ kind: "reading" });
  const [internal, setInternal] = useState<Internal>({ kind: "idle" });

  // sessionStorage is read in an effect, never during render.
  useEffect(() => {
    const stored = recallSession(scanId);
    const times = stored ? tokenTimes(stored) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps storage out of render, for one extra render.
    setToken(!stored ? { kind: "none" } : times ? { kind: "read", ...times } : { kind: "unreadable" });
  }, [scanId]);

  async function viewInternalState() {
    const stored = recallSession(scanId);
    if (!stored) return;
    setInternal({ kind: "loading" });
    try {
      const response = await fetch(`${apiUrl}/__debug/scan/${encodeURIComponent(scanId)}`, {
        headers: { Authorization: `Bearer ${stored}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        setInternal({ kind: "error", message: `The API answered ${response.status}` });
        return;
      }
      const parsed = DebugScanState.safeParse(await response.json().catch(() => null));
      setInternal(
        parsed.success
          ? { kind: "ok", state: parsed.data }
          : { kind: "error", message: "The API answered in a shape this panel does not understand" },
      );
    } catch {
      setInternal({ kind: "error", message: "The API could not be reached" });
    }
  }

  return (
    <div className="mt-2">
      <dl className={ROWS}>
        <Row label="Token">
          {token.kind === "read"
            ? `Issued ${token.issuedAt} · expires ${token.expiresAt}`
            : token.kind === "none"
              ? "No token stored for this scan"
              : token.kind === "unreadable"
                ? "Stored token is unreadable"
                : "Reading…"}
        </Row>
      </dl>
      <button
        type="button"
        onClick={() => void viewInternalState()}
        disabled={token.kind !== "read" || internal.kind === "loading"}
        className="mt-3 rounded-full bg-marino px-3 py-1 font-semibold text-white disabled:opacity-50"
      >
        View internal state
      </button>
      {internal.kind === "loading" && <p className="mt-2">Loading…</p>}
      {internal.kind === "error" && <p className="mt-2 text-rojo">{internal.message}</p>}
      {internal.kind === "ok" && (
        <div className="mt-2 rounded-xl bg-bruma p-3">
          <Json value={internal.state} />
        </div>
      )}
    </div>
  );
}
