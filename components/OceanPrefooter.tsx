"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The loop is stitched from two players: the standby one starts and takes over
// before the running one reaches its end, so the restart never cuts. The
// outgoing player fades out on top of the incoming one, which is already fully
// opaque underneath, so nothing shows through mid-fade.
const HANDOFF_SECONDS = 1.2;
const CROSSFADE_MS = 700;

/**
 * Closing block of the page: the ocean video runs behind both the CTA and the
 * footer, so the footer can sit on it as a glass panel. The footer is passed in
 * as `children` instead of being a sibling, which is what keeps them on the
 * same backdrop.
 */
export default function OceanPrefooter({ children }: { children?: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLVideoElement>(null);
  const backRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    if (!node || !front || !back) {
      return;
    }

    const players = [front, back];

    // Reduced motion: leave the first player on its first frame, never start.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      players.forEach((player) => player.pause());
      return;
    }

    let active = 0;
    let switching = false;
    let warmed = false;
    let fadeTimer = 0;

    const handOff = (event: Event) => {
      const current = event.currentTarget as HTMLVideoElement;
      if (switching || current !== players[active] || !current.duration) {
        return;
      }
      if (current.duration - current.currentTime > HANDOFF_SECONDS) {
        return;
      }

      switching = true;
      const next = players[1 - active];

      // Incoming: goes underneath and turns opaque with no transition.
      next.style.transitionDuration = "0ms";
      next.style.zIndex = "0";
      next.style.opacity = "1";
      next.currentTime = 0;
      next.play().catch(() => {});

      // Outgoing: rises above it and fades away.
      current.style.transitionDuration = `${CROSSFADE_MS}ms`;
      current.style.zIndex = "1";
      current.style.opacity = "0";

      active = 1 - active;
      fadeTimer = window.setTimeout(() => {
        current.pause();
        current.currentTime = 0;
        switching = false;
      }, CROSSFADE_MS);
    };

    players.forEach((player) => player.addEventListener("timeupdate", handOff));

    const play = () => {
      players[active].play().catch(() => {});
      if (!warmed) {
        warmed = true;
        // Buffer the standby player so its turn starts without a stall.
        const standby = players[1 - active];
        standby.preload = "auto";
        standby.load();
      }
    };
    const pause = () => players.forEach((player) => player.pause());

    if (!("IntersectionObserver" in window)) {
      play();
      return () => {
        players.forEach((player) =>
          player.removeEventListener("timeupdate", handOff),
        );
        window.clearTimeout(fadeTimer);
      };
    }

    // Only decode frames while the block is on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            play();
          } else {
            pause();
          }
        });
      },
      { threshold: 0.01 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      players.forEach((player) =>
        player.removeEventListener("timeupdate", handOff),
      );
      window.clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className="ocean-section relative isolate w-full overflow-hidden"
    >
      {/* TODO: re-encode ocean.mp4 before launch — 13 MB for a 5s loop */}
      <video
        ref={frontRef}
        src="/videos/ocean.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={{ opacity: 1, zIndex: 0 }}
        className="absolute inset-0 block h-full w-full object-cover transition-opacity ease-linear"
      />
      <video
        ref={backRef}
        src="/videos/ocean.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        style={{ opacity: 0, zIndex: 1 }}
        className="absolute inset-0 block h-full w-full object-cover transition-opacity ease-linear"
      />
      <div className="ocean-scrim pointer-events-none absolute inset-0 z-[2]" />

      <section
        aria-label="Talk to Arca"
        className="relative z-10 flex h-[280px] flex-col items-center justify-center gap-6 px-6 text-center min-[721px]:h-[330px]"
      >
        <h2 className="ocean-title text-pretty font-heading text-[clamp(34px,5.2vw,56px)] font-medium leading-[1.05] tracking-[-0.04em] text-white">
          Don&rsquo;t navigate AI risk alone
        </h2>
        <p className="ocean-copy max-w-[520px] text-pretty text-[clamp(16px,2vw,19px)] leading-relaxed text-white/80">
          Whether you&rsquo;re exploring coverage or ready to get a quote,
          we&rsquo;re here.
        </p>
        {/* TODO: open contact form modal (name, last name, email, phone, message) + connect to Supabase */}
        <button
          type="button"
          className="ocean-cta mt-2 cursor-pointer rounded-full bg-oro px-6 py-3.5 font-heading text-base font-bold tracking-[-0.01em] text-marino transition-colors duration-300 hover:bg-oro-oscuro min-[721px]:px-8 min-[721px]:py-4 min-[721px]:text-[18px]"
        >
          Start a conversation
        </button>
      </section>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
