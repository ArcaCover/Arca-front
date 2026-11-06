"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse, OrgView } from "@arca/contracts";

import { ApiError } from "@/lib/api/client";
import { recallOrg } from "@/lib/app/session";

// What the /app layout hands its private pages: the signed-in user and the organization they are in.
export type AppState = {
  me: MeResponse;
  org: OrgView;
  /** Asks /me again, after something that changes the organization (a payment, a deletion request). */
  reload: () => void;
  /** Signs out and goes to the login. */
  leave: () => void;
};

export const AppContext = createContext<AppState | null>(null);

/** What sign-in and sign-up say when signIn answers not_configured: only the mock sign-in exists before Supabase Auth. */
export const SIGN_IN_NOT_AVAILABLE = "Sign-in is not available yet in this environment.";

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error("useApp is for the private pages under the /app layout");
  return state;
}

const noSubscription = () => () => {};
/**
 * False on the server and while hydrating, true afterwards. The session and the pending claim live in browser storage,
 * so a page reads them only once this is true and the server's HTML still matches the first render.
 */
export function useBrowser(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

/** The organization the user was last in while it is still one of theirs, otherwise the first one. */
export function activeOrg(organizations: OrgView[]): OrgView | null {
  const remembered = recallOrg();
  return organizations.find(org => org.id === remembered) ?? organizations[0] ?? null;
}

/**
 * What a private page does with a failed call. The back is the one that denies: a 402 goes to billing (DN-10 §4.5) and a
 * refused session to the login; anything else is a message to show, the API's own when it sent one.
 */
export function useFailure(): (cause: unknown) => string | null {
  const router = useRouter();
  const { leave } = useApp();
  return useCallback(
    (cause: unknown) => {
      if (cause instanceof ApiError && cause.code === "payment_required") {
        router.replace("/app/billing");
        return null;
      }
      if (cause instanceof ApiError && cause.code === "unauthorized") {
        leave();
        return null;
      }
      return cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.";
    },
    [router, leave],
  );
}
