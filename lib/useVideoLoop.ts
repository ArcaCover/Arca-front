"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Seamless loop for a background video: two players of the same file take
 * turns, so it never snaps back to its first frame. The standby starts from
 * zero underneath at full opacity and the outgoing one fades out above it,
 * which is what keeps anything from showing through mid-fade.
 *
 * Attach the two refs to stacked <video> nodes and drive `play`/`pause` from
 * whatever visibility signal the section already has. Both are no-ops under
 * `prefers-reduced-motion`, which leaves the first frame showing.
 *
 * The hand-over starts `handoffSeconds` before the end and the fade takes
 * `crossfadeMs`; keep the first comfortably longer than the second so the fade
 * always finishes while the outgoing player still has frames left. The wider
 * the water on screen, the longer the fade needs to be to go unnoticed.
 */
export function useVideoLoop({
  handoffSeconds = 1.2,
  crossfadeMs = 700,
}: { handoffSeconds?: number; crossfadeMs?: number } = {}) {
  const frontRef = useRef<HTMLVideoElement>(null);
  const backRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(0);
  const warmedRef = useRef(false);

  useEffect(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !back) {
      return;
    }

    const players = [front, back];
    let switching = false;
    let fadeTimer = 0;

    const handOff = (event: Event) => {
      const current = event.currentTarget as HTMLVideoElement;
      if (
        switching ||
        current !== players[activeRef.current] ||
        !current.duration
      ) {
        return;
      }
      if (current.duration - current.currentTime > handoffSeconds) {
        return;
      }

      switching = true;
      const next = players[1 - activeRef.current];

      // Incoming: goes underneath and turns opaque with no transition.
      next.style.transitionDuration = "0ms";
      next.style.zIndex = "0";
      next.style.opacity = "1";
      next.currentTime = 0;
      next.play().catch(() => {});

      // Outgoing: rises above it and fades away.
      current.style.transitionDuration = `${crossfadeMs}ms`;
      current.style.zIndex = "1";
      current.style.opacity = "0";

      activeRef.current = 1 - activeRef.current;
      fadeTimer = window.setTimeout(() => {
        current.pause();
        current.currentTime = 0;
        switching = false;
      }, crossfadeMs);
    };

    players.forEach((player) => player.addEventListener("timeupdate", handOff));

    return () => {
      players.forEach((player) =>
        player.removeEventListener("timeupdate", handOff),
      );
      window.clearTimeout(fadeTimer);
    };
  }, [handoffSeconds, crossfadeMs]);

  const play = useCallback(() => {
    const players = [frontRef.current, backRef.current];
    const active = players[activeRef.current];
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    active.play().catch(() => {});

    if (!warmedRef.current) {
      warmedRef.current = true;
      // Buffer the standby player so its turn starts without a stall.
      const standby = players[1 - activeRef.current];
      if (standby) {
        standby.preload = "auto";
        standby.load();
      }
    }
  }, []);

  const pause = useCallback(() => {
    [frontRef.current, backRef.current].forEach((player) => player?.pause());
  }, []);

  return { frontRef, backRef, play, pause };
}
