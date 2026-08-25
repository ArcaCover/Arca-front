import { ArrowRight } from "lucide-react";

export default function PartnersHero() {
  return (
    // The navbar is fixed at 64px and transparent over the top of the page, so
    // the padding here is what keeps the headline clear of it.
    <section className="px-6 pb-20 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h1 className="text-pretty font-heading text-[clamp(34px,5vw,54px)] font-medium leading-[1.08] tracking-[-0.03em] text-marino">
          Your clients are already using AI. Now you can cover them.
        </h1>
        <p className="mt-6 max-w-[600px] text-pretty text-[18px] leading-relaxed text-marino/80">
          ARCA gives you a product no one else has — AI liability coverage for law
          firms — plus the tools to find, score, and close the right accounts.
        </p>
        <a
          href="#become-a-partner"
          className="cta-glow group mt-10 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
        >
          Request partnership
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </a>
      </div>
    </section>
  );
}
