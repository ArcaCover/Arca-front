"use client";

import { DebugScanState } from "@arca/contracts/debug";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { recallSession } from "@/lib/api/session";
import type { DebugSection } from "@/lib/debug/bridge";
import type { BackModeProbe } from "@/lib/debug/mode-check";
import type { DebugStore } from "@/lib/debug/store";
import { tokenTimes, type TokenTimes } from "@/lib/debug/token";

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

function Json({ value }: { value: unknown }) {
  return <pre className="font-body whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

type Props = { store: DebugStore; probe: BackModeProbe | null; apiUrl: string };

export default function StatePanel({ store, probe, apiUrl }: Props) {
  const pathname = usePathname();
  const scanId = useSearchParams().get("scan");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const section = SECTIONS[pathname];
  const published = section ? snapshot[section] : undefined;
  return (
    <section
      id="arca-debug-panel"
      aria-label="Debug state"
      className="max-h-[70vh] overflow-y-auto break-words border-b border-bruma bg-white px-4 py-3 font-body text-xs text-marino"
    >
      <dl className={ROWS}>
        <Row label="Page">{section ? `${pathname} (${section})` : `${pathname} (publishes no state)`}</Row>
        {section && (
          <Row label="Published state">{published ? <Json value={published} /> : "Nothing published yet"}</Row>
        )}
        <Row label="Back mode">
          {probe === null ? "Checking…" : probe.kind === "ok" ? <Json value={probe.body} /> : BACK_MODE[probe.kind]}
        </Row>
        <Row label="Scan">{scanId ?? "No scan in the URL"}</Row>
      </dl>
      {/* Keyed by scan, so a new scan starts from a fresh token reading and no internal state from the last one. */}
      {scanId && <ScanDetails key={scanId} scanId={scanId} apiUrl={apiUrl} />}
    </section>
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
