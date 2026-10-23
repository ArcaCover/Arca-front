import type { DebugSection } from "./bridge";

// The state each page published last, read by the panel through useSyncExternalStore.
export type DebugSnapshot = Partial<Record<DebugSection, Record<string, unknown>>>;

export type DebugStore = {
  publish(section: DebugSection, data: Record<string, unknown>): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): DebugSnapshot;
};

export function createDebugStore(): DebugStore {
  // Replaced, never mutated: useSyncExternalStore re-renders only when the snapshot's identity changes.
  let snapshot: DebugSnapshot = {};
  const listeners = new Set<() => void>();
  return {
    publish(section, data) {
      snapshot = { ...snapshot, [section]: data };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
  };
}

// Gives the bridge somewhere to publish to.
export function installDebugStore(): DebugStore {
  const store = createDebugStore();
  window.__arcaDebug = store;
  return store;
}
