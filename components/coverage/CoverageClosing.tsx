import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Full-width marino, separate from the first-party panel above it: that one is
// a card on the canvas, this one is the page closing.
export default function CoverageClosing() {
  return (
    <section className="relative mt-28 overflow-hidden bg-marino px-6 py-20 sm:px-[60px] sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_12%_8%,color-mix(in_srgb,var(--color-cielo)_20%,transparent)_0%,transparent_70%),radial-gradient(45%_60%_at_88%_100%,color-mix(in_srgb,var(--color-cielo)_16%,transparent)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="cv-float-slow pointer-events-none absolute left-1/2 top-1/2 -ml-[260px] -mt-[260px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-cielo)_16%,transparent)_0%,transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h2 className="text-pretty font-heading text-[clamp(30px,4.2vw,48px)] font-medium leading-[1.1] tracking-[-0.03em] text-white">
          Your malpractice policy wasn&rsquo;t built for AI. This one is.
        </h2>
        <p className="mt-[22px] max-w-[600px] text-pretty text-[18px] leading-[1.65] text-white/80">
          See how your firm scores on AI governance and what coverage looks like for your
          practice.
        </p>

        <Link
          href="/quote"
          className="group mt-[42px] inline-flex cursor-pointer items-center gap-[14px] rounded-full bg-oro py-2.5 pl-[30px] pr-2.5 font-heading text-[17px] font-medium tracking-[-0.01em] text-marino shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--color-oro)_90%,transparent)] transition-transform duration-200 hover:-translate-y-px"
        >
          Get a quote
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </Link>

        <p className="mt-[26px] text-[15px] text-white/70">
          Are you a broker?{" "}
          <Link href="/partners" className="font-bold text-white underline underline-offset-4">
            Partner with us
          </Link>
        </p>
      </div>
    </section>
  );
}
