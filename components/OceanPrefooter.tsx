"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Closing block of the page: the ocean video runs behind both the CTA and the
 * footer, so the footer can sit on it as a glass panel. The footer is passed in
 * as `children` instead of being a sibling, which is what keeps them on the
 * same backdrop.
 */
export default function OceanPrefooter({ children }: { children?: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    const video = videoRef.current;
    if (!node || !video) {
      return;
    }

    // Reduced motion: leave the video on its first frame and never start it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }

    if (!("IntersectionObserver" in window)) {
      video.play().catch(() => {});
      return;
    }

    // Only decode frames while the block is on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.01 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="ocean-section relative isolate w-full overflow-hidden"
    >
      {/* TODO: re-encode ocean.mp4 before launch — 13 MB for a 5s loop */}
      <video
        ref={videoRef}
        src="/videos/ocean.mp4"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full object-cover"
      />
      <div className="ocean-scrim pointer-events-none absolute inset-0" />

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
