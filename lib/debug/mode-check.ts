import { DebugModeResponse } from "@arca/contracts/debug";

// The banner's check against the back (DN-09 §6.2): it only shows a mode the back confirmed.
export type DebugMode = "mock" | "live-debug";

export type BackModeProbe = { kind: "ok"; body: DebugModeResponse } | { kind: "absent" } | { kind: "unreachable" };

export type ModeCheck = { state: "match"; mode: DebugMode } | { state: "mismatch"; label: string };

export async function probeBackMode(baseUrl: string, fetcher = fetch): Promise<BackModeProbe> {
  let response: Response;
  try {
    response = await fetcher(`${baseUrl}/__debug/mode`, { signal: AbortSignal.timeout(5000) });
  } catch {
    return { kind: "unreachable" };
  }
  // A back that answers without a debug mode (404 in production, or a shape this front does not know) is absent.
  if (!response.ok) return { kind: "absent" };
  const parsed = DebugModeResponse.safeParse(await response.json().catch(() => null));
  return parsed.success ? { kind: "ok", body: parsed.data } : { kind: "absent" };
}

export function checkModes(front: DebugMode, probe: BackModeProbe): ModeCheck {
  if (probe.kind !== "ok") {
    return { state: "mismatch", label: `MODE MISMATCH · front=${front}, back unreachable or production` };
  }
  if (probe.body.mode !== front) {
    return { state: "mismatch", label: `MODE MISMATCH · front=${front}, back=${probe.body.mode}` };
  }
  return { state: "match", mode: front };
}
