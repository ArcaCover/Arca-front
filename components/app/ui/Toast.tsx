"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

/** The one line every not-yet-connected button answers with (spec 2026-10-29 §7). */
export const PREVIEW_ONLY = "Preview only: this isn't connected yet.";

type Toast = { id: number; title: string; detail?: string };
type Notify = (title: string, detail?: string) => void;

const ToastContext = createContext<Notify | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const notify = useCallback<Notify>((title, detail) => {
    next.current += 1;
    const id = next.current;
    setToasts(list => [...list.slice(-2), { id, title, detail }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(toast => toast.id !== id)), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);
  return (
    <div role="status" className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-marino p-4 text-sm text-white shadow-xl">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-oro" />
      <div className="flex-1">
        <p className="font-semibold">{toast.title}</p>
        {toast.detail && <p className="mt-0.5 text-white/75">{toast.detail}</p>}
      </div>
      <button type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)} className="rounded-full p-0.5 hover:bg-white/10">
        <X aria-hidden className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Shows a toast. Outside a provider (a page rendered alone in a test) it does nothing. */
export function useToast(): Notify {
  return useContext(ToastContext) ?? noop;
}
const noop: Notify = () => {};

/** The usual answer of a preview button: the shared line, plus what would happen once it is connected. */
export function usePreview(): (detail?: string) => void {
  const notify = useToast();
  return useCallback((detail?: string) => notify(PREVIEW_ONLY, detail), [notify]);
}
