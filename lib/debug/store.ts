import type { DebugSection } from "./bridge";

// The state each page published last, read by the panel through useSyncExternalStore.
export type DebugSnapshot = Partial<Record<DebugSection, Record<string, unknown>>>;

export type DebugStore = {
  publish(section: DebugSection, data: Record<string, unknown>): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): DebugSnapshot;
};

export function createDebugStore(initial: DebugSnapshot = {}): DebugStore {
  // Replaced, never mutated: useSyncExternalStore re-renders only when the snapshot's identity changes.
  let snapshot: DebugSnapshot = initial;
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

// Gives the bridge somewhere to publish to. A store that is already installed is kept, so a remount (or a hot reload of
// the panel) keeps its state and its subscribers; only this function writes __arcaDebug, hence the cast.
export function installDebugStore(): DebugStore {
  const installed = window.__arcaDebug as DebugStore | undefined;
  if (installed) return installed;
  const store = createDebugStore(window.__arcaDebugPending);
  delete window.__arcaDebugPending;
  window.__arcaDebug = store;
  return store;
}
