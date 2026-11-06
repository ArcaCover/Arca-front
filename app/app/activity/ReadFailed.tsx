import Link from "next/link";

import { LoadFailed, buttonClass } from "@/components/app/ui";
import { ApiError, type ApiErrorCode } from "@/lib/api/client";

// The organization's activity and ARCA's panel read the same way and fail the same way: the panel imports this, as it
// imports the activity's words. A refusal (401, 403, 404, 410) is the same answer however often it is asked, so it says why
// instead of offering Try again, or Load more for a later page. Any other failure (the network, a 429, a 500) may pass, and
// gets the kit's LoadFailed.

export type Failure = { message: string; cause: unknown };

const WHY: Partial<Record<ApiErrorCode, string>> = {
  unauthorized: "Your session has ended, so trying again would get the same answer.",
  forbidden: "Your access does not include this, so trying again would get the same answer.",
  not_found: "It cannot be found, so trying again would get the same answer.",
  gone: "It was deleted, so trying again would get the same answer.",
};

/** Why asking again would get the same answer; undefined when it might not. */
export const refusalOf = (cause: unknown): string | undefined => (cause instanceof ApiError ? WHY[cause.code] : undefined);

/** A failed read's reason and, for a refusal, why there is no point asking again. */
export function FailureNote({ failure, className }: { failure: Failure; className?: string }) {
  const why = refusalOf(failure.cause);
  // The organization's pages leave for the login on a 401 (useFailure); ARCA's panel, with no organization, says it here.
  const signedOut = failure.cause instanceof ApiError && failure.cause.code === "unauthorized";
  return (
    <div className={className}>
      <p role="alert" className="text-sm text-rojo">
        {failure.message}
      </p>
      {why && <p className="mt-2 text-sm text-marino/70">{why}</p>}
      {signedOut && (
        <Link href="/app/login" className={`${buttonClass.secondary} mt-4`}>
          Sign in again
        </Link>
      )}
    </div>
  );
}

/** A page or tab whose first read failed: the reason, then Try again or, for a refusal, why there is none. */
export function ReadFailed({ failure, onRetry, className }: { failure: Failure; onRetry: () => void; className?: string }) {
  if (!refusalOf(failure.cause)) return <LoadFailed message={failure.message} onRetry={onRetry} className={className} />;
  return <FailureNote failure={failure} className={className} />;
}
