import { COVERAGES } from "@/lib/coverages";

// Fades the marquee in and out at both ends of its band. Applied inline
// because the CSS pipeline strips mask-image declarations from stylesheets.
const BAND_FADE =
  "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)";

/**
 * The original "What we cover" belt, kept verbatim after ToolsBelt and RisksBelt
 * replaced it on the landing. It used to live inline inside Hero, which is why
 * it is the only place the 8 coverage names ever appeared — nothing renders it
 * today, so `lib/coverages.ts` is currently unconsumed.
 *
 * Two things to fix if it is ever revived: the `pt-24` below is hero-era
 * spacing meant to clear the orb's rings, not the `py-12` the other belts use
 * on the page canvas; and unlike them it never learned to pause off-screen via
 * useInView, so its marquee runs for the life of the page.
 */
export default function CoverageBelt() {
  return (
    <div className="relative mx-auto max-w-[1240px] px-8 pb-12 pt-24 lg:px-[76px]">
      {/* Stays under the hero's own voice: below the 19px subtitle and level
          with the CTA, a step over the 16px items it introduces. Its presence
          comes from the weight, since going bigger outranks the subtitle. */}
      <p className="mb-5 text-center font-heading text-[17px] font-semibold tracking-tight text-marino/40">
        What we cover
      </p>
      <div
        aria-hidden="true"
        style={{ WebkitMaskImage: BAND_FADE, maskImage: BAND_FADE }}
        className="overflow-hidden"
      >
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10 pr-10">
              {COVERAGES.map((coverage) => (
                <span
                  key={coverage}
                  className="whitespace-nowrap font-heading text-base font-medium tracking-tight text-marino/40"
                >
                  {coverage}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
