"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog or a side panel. A div with role="dialog" rather than <dialog>: jsdom does not implement showModal,
 * and the tests render these. Focus moves in on open, stays inside with Tab, and returns on close; Escape closes.
 */
export function Dialog({
  open, onClose, title, description, children, footer, variant = "modal",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    (node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const drawer = variant === "drawer";
  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 bg-marino/40" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          drawer
            ? // --app-top is the debug strip's height, set by the /app shell; the panel starts below it.
              "absolute bottom-0 right-0 top-[var(--app-top,0px)] flex w-full max-w-md flex-col bg-white shadow-2xl"
            : "absolute left-1/2 top-1/2 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl bg-white shadow-2xl"
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-marino/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-heading text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-marino/70">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-marino/5">
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-marino/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
