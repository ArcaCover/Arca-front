export default function CoverageHero() {
  return (
    // The navbar is fixed at 64px and transparent over the top of the page, so
    // the padding here is what keeps the headline clear of it.
    <section className="px-6 pb-16 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
        <h1 className="text-pretty font-heading text-[clamp(34px,5vw,54px)] font-medium leading-[1.08] tracking-[-0.03em] text-marino">
          Eight coverages for the risks AI creates in your practice.
        </h1>
        <p className="mt-6 max-w-[640px] text-pretty text-[18px] leading-relaxed text-marino/80">
          One purpose-built policy that covers what happens when AI-assisted work goes
          wrong — from client harm to the costs your firm absorbs to make it right.
        </p>
      </div>
    </section>
  );
}
