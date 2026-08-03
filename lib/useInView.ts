"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether an element is on screen.
 *
 * With `once` (the default) it fires a single time and stops observing, which
 * is what one-shot entrances need. Pass `once: false` to keep tracking, so
 * looping animations can be paused again once the element leaves.
 */
export function useInView<T extends HTMLElement>({
  threshold = 0.4,
  once = true,
}: { threshold?: number; once?: boolean } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, inView] as const;
}
