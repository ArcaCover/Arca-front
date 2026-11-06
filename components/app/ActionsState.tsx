"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActionItemView, ActionPlanResponse } from "@arca/contracts";

import { useApp } from "@/components/app/AppContext";
import { getActionPlan } from "@/lib/app/client";

// The organization's real action plan (DN-11 §6.4), read once for the whole /app shell: the sidebar counter, the Overview,
// the search and Monitoring all take it from here. The layout mounts it inside AppContext, under the same key per
// organization, so switching organization starts it over.

export type ActionsState = {
  /** The current plan's actions. Null until they arrive, and whenever they cannot: an unpaid organization, or a failure. */
  items: ActionItemView[] | null;
  /** The analysis the assessment's actions come from. Null with no assessment yet, and whenever items is. */
  source: ActionPlanResponse["source"];
  /** The actions not done yet. Null whenever items is, so a counter simply does not show. */
  openCount: number | null;
  /** Why the last request failed, for a page that wants to say so. The provider itself never redirects, not even on 402. */
  error: unknown;
  /** Asks for the plan again, after a change. */
  refresh: () => void;
};

const ActionsContext = createContext<ActionsState | null>(null);

export function ActionsProvider({ children }: { children: ReactNode }) {
  const { org } = useApp();
  const [plan, setPlan] = useState<ActionPlanResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);

  // Only a paid organization has a plan to read: the back answers 402 otherwise. A 402 or 403 that still comes (the
  // payment lapsed since /me) only leaves the plan out; the page the user is on decides what to do about it.
  useEffect(() => {
    if (!org.paidAccess) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await getActionPlan(org.id);
        if (cancelled) return;
        setPlan(next);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setPlan(null);
        setError(cause);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org.id, org.paidAccess, version]);

  const value = useMemo<ActionsState>(() => {
    // An organization that stops being paid keeps no plan from before.
    const current = org.paidAccess ? plan : null;
    const items = current?.items ?? null;
    return {
      items,
      source: current?.source ?? null,
      openCount: items ? items.filter(item => item.status !== "done").length : null,
      error: org.paidAccess ? error : null,
      refresh,
    };
  }, [org.paidAccess, plan, error, refresh]);

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

const OUTSIDE: ActionsState = { items: null, source: null, openCount: null, error: null, refresh: () => {} };

/** The organization's action plan. Outside the /app layout (a page rendered alone in a test) there is none. */
export function useActions(): ActionsState {
  return useContext(ActionsContext) ?? OUTSIDE;
}
