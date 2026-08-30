"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Drives one card's "Imagine this" scenario.
 *
 * On a pointer device the scenario follows the cursor: it opens on enter and
 * closes on leave, and a click pins it open until the next click. Where there
 * is no hover — phones, tablets — that would leave the text unreachable, so
 * the toggle is the only behaviour and the hint says "Tap to read".
 *
 * The scenario is copy, not decoration, so it must also be reachable from the
 * keyboard: the caller renders the trigger as a real button and pinning is
 * what its Enter and Space presses land on.
 */
export function useCoverageReveal() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);
  const toggle = useCallback(() => setPinned((open) => !open), []);

  const open = canHover ? pinned || hovered : pinned;

  return {
    open,
    toggle,
    // Hover is an enhancement on top of the toggle, never the only way in.
    onEnter: canHover ? onEnter : undefined,
    onLeave: canHover ? onLeave : undefined,
    hint: open ? "Close" : canHover ? "Hover to read" : "Tap to read",
  };
}
