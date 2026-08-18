"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RotatingBadge from "./RotatingBadge";

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const ringOuterRef = useRef<HTMLDivElement>(null);
  const ringFarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const hero = heroRef.current;
    const glow = glowRef.current;
    const halo = haloRef.current;
    const orb = orbRef.current;
    const highlight = highlightRef.current;
    const ringOuter = ringOuterRef.current;
    const ringFar = ringFarRef.current;
    if (!hero || !glow || !halo || !orb || !highlight || !ringOuter || !ringFar) {
      return;
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let targetX = 0;
    let targetY = 0;
    let fastX = 0;
    let fastY = 0;
    let slowX = 0;
    let slowY = 0;
    let frameId = 0;
    const start = performance.now();

    const handlePointerMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      targetX = Math.max(-1, Math.min(1, x));
      targetY = Math.max(-1, Math.min(1, y));
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    if (fine) {
      hero.addEventListener("pointermove", handlePointerMove);
      hero.addEventListener("pointerleave", handlePointerLeave);
    }

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;

      // Without a fine pointer (touch screens) the orb drifts on its own
      // rather than sitting still with nothing to follow.
      if (!fine) {
        targetX = Math.sin(elapsed * 0.42) * 0.55;
        targetY = Math.sin(elapsed * 0.42 * 0.73 + 1.2) * 0.5;
      }

      fastX += (targetX - fastX) * 0.055;
      fastY += (targetY - fastY) * 0.055;
      slowX += (targetX - slowX) * 0.022;
      slowY += (targetY - slowY) * 0.022;

      const bob = Math.sin(elapsed * 0.6) * 5;

      glow.style.transform = `translate3d(${slowX * 90}px, ${slowY * 70}px, 0)`;
      halo.style.transform = `translate3d(${slowX * 34}px, ${slowY * 28 + bob * 0.5}px, 0)`;
      orb.style.transform =
        `translate3d(${fastX * 10}px, ${fastY * 8 + bob}px, 0)` +
        ` rotateX(${-fastY * 11}deg) rotateY(${fastX * 13}deg)`;
      highlight.style.transform = `translate3d(${fastX * 26}px, ${fastY * 22}px, 0)`;
      ringOuter.style.transform =
        `translate3d(${slowX * 24}px, ${slowY * 20 + bob * 0.5}px, 0)` +
        ` rotateX(${-slowY * 7}deg) rotateY(${slowX * 9}deg)`;
      ringFar.style.transform =
        `translate3d(${slowX * 40}px, ${slowY * 34 + bob * 0.3}px, 0)` +
        ` rotateX(${-slowY * 5}deg) rotateY(${slowX * 6}deg)`;

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <section id="top" ref={heroRef} className="bg-canvas relative overflow-hidden">
      <div
        ref={glowRef}
        aria-hidden="true"
        className="orb-glow pointer-events-none absolute left-[-220px] top-[-260px] h-[900px] w-[900px] rounded-full blur-[20px] [will-change:transform]"
      />

      {/* The top padding is on the grid, not on a single column, so both the
          copy and the orb centre on the same axis and the badge clears the nav.
          The bottom padding is what the outer ring hangs into: it reaches past
          the grid, and the section clips overflow, so at lg:pb-0 the ring lost
          its lower arc. Kept tight on purpose — the next section has to break
          the fold to read as an invitation to scroll. */}
      <div className="relative mx-auto grid min-h-[660px] max-w-[1240px] items-center gap-16 px-8 pb-24 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-[76px] lg:pb-12 lg:pt-32">
        {/* Sits above the orb: the outer rings drift with the cursor and would
            otherwise sweep across the badge, the headline and the CTA. */}
        <div className="relative z-10 flex max-w-[540px] flex-col items-start gap-7">
          <RotatingBadge className="animate-fade-up" />
          <h1 className="animate-fade-up text-pretty font-heading text-[clamp(38px,8vw,56px)] font-semibold leading-[1.03] tracking-[-0.038em] text-marino [animation-delay:100ms] lg:text-[66px]">
            Insurance for lawyers who rely on AI.
          </h1>
          <p className="max-w-[430px] animate-fade-up text-pretty text-[19px] leading-relaxed text-marino/65 [animation-delay:200ms]">
            AI moves faster than the risks it creates. Arca is the eye that
            watches over your practice, from AI-drafted errors to automated
            decisions, so you stay protected.
          </p>
          <Link
            href="/quote"
            className="cta-glow group inline-flex animate-fade-up cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 [animation-delay:300ms] hover:-translate-y-px"
          >
            Get a quote
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <div
          aria-hidden="true"
          className="relative flex min-h-[400px] items-center justify-center [perspective:1100px] lg:min-h-[560px]"
        >
          <div
            ref={haloRef}
            className="orb-halo absolute h-[400px] w-[400px] rounded-full blur-[10px] [will-change:transform] lg:h-[520px] lg:w-[520px]"
          />
          <div
            ref={orbRef}
            className="orb-sphere relative h-[270px] w-[270px] rounded-full [transform-style:preserve-3d] [will-change:transform] lg:h-[352px] lg:w-[352px]"
          >
            <div
              ref={highlightRef}
              className="orb-highlight absolute inset-0 rounded-full [will-change:transform]"
            />
            <div className="orb-bounce absolute inset-0 rounded-full" />
          </div>
          <div
            ref={ringOuterRef}
            className="orb-ring absolute h-[350px] w-[350px] rounded-full border border-cielo/30 [will-change:transform] lg:h-[452px] lg:w-[452px]"
          />
          <div
            ref={ringFarRef}
            className="orb-ring absolute h-[440px] w-[440px] rounded-full border border-cielo/15 [will-change:transform] lg:h-[572px] lg:w-[572px]"
          />
        </div>
      </div>

    </section>
  );
}
