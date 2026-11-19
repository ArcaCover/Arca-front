import { ApiError } from "@/lib/api/client";

/**
 * What a sign-up or an invitation says when POST /auth/enroll refuses (DN-13 §17.8). The back answers one 410 for any claim
 * or invitation that no longer works, whatever the reason, so the page cannot be more precise than "no longer valid" either.
 */
export function enrollFailure(cause: unknown, kind: "claim" | "invitation"): string {
  if (!(cause instanceof ApiError)) return "We could not start the sign-in. Please try again.";
  switch (cause.code) {
    case "gone":
      return kind === "claim"
        ? "This link to save your results has expired or was already used. Run a new scan to save its results."
        : "This invitation is no longer valid. Ask the person who invited you to send a new one.";
    case "rate_limited": {
      if (!cause.retryAfter) return "Too many attempts. Please wait a few minutes and try again.";
      const minutes = Math.ceil(cause.retryAfter / 60);
      return `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
    }
    case "auth_unavailable":
      return "Sign-in is temporarily unavailable. Please try again in a moment.";
    default:
      return cause.message;
  }
}

/** What the sign-up and the invitation say when Supabase did not send the code after a successful enroll. */
export const CODE_NOT_SENT = "We could not send the code. Wait a minute and try again.";
