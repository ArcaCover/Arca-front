"use client";

import { useEffect, useRef, useState } from "react";

// Fixed commercial sequence: the order is deliberate, never shuffled.
const AUDIENCES = [
  "Built for law firms",
  "Built for independent lawyers",
  "Built for accounting firms",
  "Built for independent accountants",
  "Built for consulting firms",
  "Built for independent consultants",
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

  // The phrases are stacked in one grid cell, so the pill would otherwise sit at
  // the widest of them. Measuring the active one lets it ease between lengths.
  useEffect(() => {
    const active = phraseRefs.current[index];
    if (active) {
      setWidth(active.offsetWidth);
    }
  }, [index]);

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
            aria-hidden={position !== index}
            className={`badge-phrase col-start-1 row-start-1 w-max whitespace-nowrap transition-all duration-500 ease-out ${
              position === index
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
