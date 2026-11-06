import { DebugSeedResponse } from "@arca/contracts/debug";

import { apiFailure, apiParse, apiSend } from "@/lib/api/client";

// The demo organization of the mock back (DN-11 section 4.6): one paid organization with a user of each role, built through
// the real flow. Asking again returns the same one. The route exists only in mock and refuses a request without the debug
// header. Only debug code reaches this module; signing in as one of the users goes through the mock login.

// The back runs a scan and an assessment and gives up after 60 seconds with a 504, so the request waits a little longer
// than that: the back's answer, not the browser's timeout, says what happened.
const SEED_TIMEOUT_MS = 75_000;

export async function mockSeed(): Promise<DebugSeedResponse> {
  const response = await apiSend("/__debug/seed", { method: "POST", headers: { "X-Arca-Debug": "1" } }, SEED_TIMEOUT_MS);
  if (!response.ok) throw await apiFailure(response);
  return apiParse(DebugSeedResponse, await response.json().catch(() => null));
}
