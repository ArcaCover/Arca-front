"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem<K extends string> = { key: K; label: string; count?: number };

/** Tabs with arrow-key movement, as the ARIA tabs pattern asks. The parent holds which one is active. */
export function Tabs<K extends string>({
  items, active, onChange, label, panel,
}: { items: TabItem<K>[]; active: K; onChange: (key: K) => void; label: string; panel: ReactNode }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next].key);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-marino/10">
        {items.map((item, index) => {
          const selected = item.key === active;
          return (
            <button
              key={item.key}
              ref={node => {
                refs.current[index] = node;
              }}
              id={`${base}-tab-${item.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.key)}
              onKeyDown={event => onKey(event, index)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${
                selected ? "border-oro text-marino" : "border-transparent text-marino/60 hover:text-marino"
              }`}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-marino/5 px-1.5 text-[11px] text-marino/70">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="pt-6">
        {panel}
      </div>
    </div>
  );
}

/** Pill filters: a row of toggle buttons where one is pressed. */
export function FilterPills<K extends string>({
  items, active, onChange, label,
}: { items: TabItem<K>[]; active: K; onChange: (key: K) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          aria-pressed={item.key === active}
          onClick={() => onChange(item.key)}
          className="rounded-full border border-marino/15 bg-white px-3 py-1.5 text-xs font-semibold text-marino/75 aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-white"
        >
          {item.label}
          {item.count !== undefined && <span className="ml-1.5 opacity-70">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
