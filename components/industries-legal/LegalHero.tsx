import { ArrowRight } from "lucide-react";

export default function LegalHero() {
  return (
    // The navbar is fixed at 64px and transparent over the top of the page, so
    // the padding here is what keeps the headline clear of it.
    <section className="px-6 pb-20 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
        <h1 className="text-pretty font-heading text-[clamp(34px,5vw,54px)] font-medium leading-[1.08] tracking-[-0.03em] text-marino">
          AI is changing how you practice law. Your coverage hasn&rsquo;t caught up.
        </h1>
        <p className="mt-6 max-w-[640px] text-pretty text-[18px] leading-relaxed text-marino/80">
          Law firms are adopting AI faster than any other professional sector. But the
          liability framework around it is still being written — and most malpractice
          policies were never designed for it.
        </p>
        <a
          href="#built-for-your-practice"
          className="cta-glow group mt-10 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
        >
          See how we help
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </a>
      </div>
    </section>
  );
}
