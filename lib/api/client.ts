import { PollResponse, ScanResponse, type PollResponse as Poll, type ScanResponse as Scan } from "@arca/contracts";

// The browser talks to the API directly. There is no proxy on purpose: the scan rate limit
// counts real client IPs, and routing every visitor through one server would spend a single
// allowance on all of them. See the design note for the full reasoning.
function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new ApiError(
      "misconfigured",
      "NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local and point it at the API.",
    );
  }
  return url.replace(/\/+$/, "");
}

/** Everything the UI has to tell apart. `contract` means the API answered with a shape we
    do not recognise, which is a deployment mismatch rather than a user-facing failure. */
export type ApiErrorCode =
  | "invalid_request"
  | "invalid_domain"
  | "rate_limited"
  | "unauthorized"
  | "not_found"
  | "internal_error"
  | "network"
  | "contract"
  | "misconfigured";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    /** Seconds, from the Retry-After header. Only set on `rate_limited`. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const ERROR_CODES = new Set<string>([
  "invalid_request",
  "invalid_domain",
  "rate_limited",
  "unauthorized",
  "not_found",
  "internal_error",
]);

async function failure(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
  const body: unknown = await response.json().catch(() => null);
  const payload = body as { error?: unknown; message?: unknown } | null;
  const code = typeof payload?.error === "string" && ERROR_CODES.has(payload.error)
    ? (payload.error as ApiErrorCode)
    : "internal_error";
  const message = typeof payload?.message === "string" ? payload.message : "The scan service failed.";
  return new ApiError(code, message, code === "rate_limited" ? retryAfter : undefined);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}${path}`, init);
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError("network", "We could not reach the scan service. Check your connection and try again.");
  }
}

/** Every response is parsed against the published contract before the UI sees it, so a
    deployment mismatch surfaces as a legible error instead of a render crash. */
function parse<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch {
    throw new ApiError("contract", "The scan service answered in a shape this app does not understand.");
  }
}

export async function startScan(input: { email: string; domain: string }): Promise<Scan> {
  const response = await send("/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, domain: input.domain }),
  });
  if (!response.ok) throw await failure(response);
  return parse(ScanResponse, await response.json().catch(() => null));
}

export async function pollScan(scanId: string, sessionToken: string): Promise<Poll> {
  const response = await send(`/scan/${encodeURIComponent(scanId)}`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) throw await failure(response);
  return parse(PollResponse, await response.json().catch(() => null));
}
