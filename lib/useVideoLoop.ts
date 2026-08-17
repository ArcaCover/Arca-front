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
 * always finishes while the outgoing player still has frames left.
 *
 * Keep the fade SHORT. It is tempting to lengthen it to make the seam gentler,
 * but the two frames being blended are the clip's last and its first, and on
 * ocean.mp4 those differ by about 35 luminance levels per pixel — the waves sit
 * in entirely different places. Blending them halves nothing and instead drops
 * about 12% of the contrast, so the water turns milky for as long as the fade
 * lasts and reads as the light flickering. A longer fade does not hide the
 * seam, it just spends more time in the state you were trying to hide.
 *
 * Do not shrink `handoffSeconds` to buy the same result — the trigger is a
 * `timeupdate`, whose rate the browser is free to drop when the tab is busy or
 * throttled. If the threshold is tighter than the gap between two of those
 * events the hand-over never fires at all and the player falls back on its own
 * `loop`, which is a hard cut. 1.2s leaves room for a late event and still
 * finishes the fade well before the clip runs out.
 *
 * The defaults suit the 5.2s ocean clip: the blend is on screen for roughly a
 * ninth of each cycle. If a longer clip is ever used, these can grow with it.
 */
export function useVideoLoop({
  handoffSeconds = 1.2,
  crossfadeMs = 450,
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
