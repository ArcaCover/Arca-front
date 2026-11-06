"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

import { SAMPLE_ACTIONS, type ActionStatus, type SampleAction } from "@/lib/app/mock/actions";
import { SAMPLE_ALERTS, type SampleAlert } from "@/lib/app/mock/alerts";

// The preview's shared state: the action plan and the alerts, read by Overview, the sidebar counters and their pages.
// In memory only; a reload starts over, and the pages say so (spec 2026-10-29 §7).

export type SampleData = { actions: SampleAction[]; alerts: SampleAlert[] };

export type SampleEvent =
  | { type: "action.status"; id: string; status: ActionStatus }
  | { type: "action.assignee"; id: string; assignee: string | null }
  | { type: "action.from_alert"; alert: SampleAlert }
  | { type: "alert.read"; id: string }
  | { type: "alert.read_all" }
  | { type: "alert.dismiss"; id: string };

export const initialSample = (): SampleData => ({ actions: SAMPLE_ACTIONS, alerts: SAMPLE_ALERTS });

export function sampleReducer(state: SampleData, event: SampleEvent): SampleData {
  switch (event.type) {
    case "action.status":
      return { ...state, actions: state.actions.map(item => (item.id === event.id ? { ...item, status: event.status } : item)) };
    case "action.assignee":
      return { ...state, actions: state.actions.map(item => (item.id === event.id ? { ...item, assignee: event.assignee } : item)) };
    case "action.from_alert": {
      const id = `act_${event.alert.id}`;
      if (state.actions.some(item => item.id === id)) return state;
      const created: SampleAction = {
        id, title: event.alert.suggestedAction, detail: event.alert.title, domain: "From monitoring", points: 2,
        status: "todo", assignee: null, due: null, sample: true,
      };
      return {
        actions: [created, ...state.actions],
        alerts: state.alerts.map(alert => (alert.id === event.alert.id ? { ...alert, read: true } : alert)),
      };
    }
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
  openActions: number;
  unreadAlerts: number;
};

const SampleContext = createContext<SampleState | null>(null);

export function SampleStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  const value = useMemo<SampleState>(
    () => ({
      ...state,
      dispatch,
      openActions: state.actions.filter(item => item.status !== "done").length,
      unreadAlerts: state.alerts.filter(alert => !alert.read).length,
    }),
    [state],
  );
  return <SampleContext.Provider value={value}>{children}</SampleContext.Provider>;
}

/** The preview's state. A page rendered outside the /app layout (a unit test) gets a fresh one of its own. */
export function useSample(): SampleState {
  const state = useContext(SampleContext);
  const [fallback, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  return (
    state ?? {
      ...fallback,
      dispatch,
      openActions: fallback.actions.filter(item => item.status !== "done").length,
      unreadAlerts: fallback.alerts.filter(alert => !alert.read).length,
    }
  );
}
