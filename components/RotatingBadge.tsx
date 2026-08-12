"use client";

import { useEffect, useRef, useState } from "react";

// Fixed commercial sequence: the order is deliberate, never shuffled.
const AUDIENCES = [
  "Built for independent lawyers",
  "Built for law firms",
  "Built for legal partnerships",
];

const ROTATION_MS = 3000;

export default function RotatingBadge({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number>();
  const phraseRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Reduced motion keeps the first phrase on screen and never rotates.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % AUDIENCES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  // Wrapped rather than read straight: if the list ever changes while a count
  // is already running, an out-of-range index would leave the pill blank.
  const current = index % AUDIENCES.length;

  // The phrases are stacked in one grid cell, so the pill would otherwise sit at
  // the widest of them. Measuring the active one lets it ease between lengths.
  useEffect(() => {
    const active = phraseRefs.current[current];
    if (active) {
      setWidth(active.offsetWidth);
    }
  }, [current]);

  return (
    <div
      className={`inline-flex items-center gap-[9px] rounded-full bg-bruma py-2 pl-3 pr-[15px] font-heading text-[13.5px] font-medium tracking-tight text-marino ${className}`}
    >
      <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-full bg-cielo" />
      <span
        className="badge-rotator grid overflow-hidden transition-[width] duration-500 ease-out"
        style={width === undefined ? undefined : { width }}
      >
        {AUDIENCES.map((audience, position) => (
          <span
            key={audience}
            ref={(node) => {
              phraseRefs.current[position] = node;
            }}
            aria-hidden={position !== current}
            className={`badge-phrase col-start-1 row-start-1 w-max whitespace-nowrap transition-all duration-500 ease-out ${
              position === current
                ? "translate-y-0 opacity-100"
                : "-translate-y-1.5 opacity-0"
            }`}
          >
            {audience}
          </span>
        ))}
      </span>
    </div>
  );
}
