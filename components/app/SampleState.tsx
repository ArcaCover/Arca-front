"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

import { SAMPLE_ALERTS, type SampleAlert } from "@/lib/app/mock/alerts";

// The preview's shared state: the alerts, read by Overview, the bell, the sidebar counter and Monitoring. In memory only;
// a reload starts over, and the pages say so (spec 2026-10-29 §7). The action plan is real now and lives in ActionsState.

export type SampleData = { alerts: SampleAlert[] };

export type SampleEvent =
  | { type: "alert.read"; id: string }
  | { type: "alert.read_all" }
  | { type: "alert.dismiss"; id: string };

export const initialSample = (): SampleData => ({ alerts: SAMPLE_ALERTS });

export function sampleReducer(state: SampleData, event: SampleEvent): SampleData {
  switch (event.type) {
    case "alert.read":
      return { ...state, alerts: state.alerts.map(alert => (alert.id === event.id ? { ...alert, read: true } : alert)) };
    case "alert.read_all":
      return { ...state, alerts: state.alerts.map(alert => ({ ...alert, read: true })) };
    case "alert.dismiss":
      return { ...state, alerts: state.alerts.filter(alert => alert.id !== event.id) };
  }
}

type SampleState = SampleData & {
  dispatch: (event: SampleEvent) => void;
  unreadAlerts: number;
};

const SampleContext = createContext<SampleState | null>(null);

export function SampleStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  const value = useMemo<SampleState>(
    () => ({ ...state, dispatch, unreadAlerts: state.alerts.filter(alert => !alert.read).length }),
    [state],
  );
  return <SampleContext.Provider value={value}>{children}</SampleContext.Provider>;
}

/** The preview's state. A page rendered outside the /app layout (a unit test) gets a fresh one of its own. */
export function useSample(): SampleState {
  const state = useContext(SampleContext);
  const [fallback, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  return state ?? { ...fallback, dispatch, unreadAlerts: fallback.alerts.filter(alert => !alert.read).length };
}
