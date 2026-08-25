import { ArrowRight } from "lucide-react";

export default function PlatformsHero() {
  return (
    // The navbar is fixed at 64px and transparent over the top of the page, so
    // the padding here is what keeps the headline clear of it.
    <section className="px-6 pb-20 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
        <h1 className="text-pretty font-heading text-[clamp(34px,5vw,54px)] font-medium leading-[1.08] tracking-[-0.03em] text-marino">
          Embed AI liability coverage directly into your platform.
        </h1>
        <p className="mt-6 max-w-[640px] text-pretty text-[18px] leading-relaxed text-marino/80">
          Your users already manage their practice on your platform. Now they can score
          their AI risk, get a quote, and bind coverage — without ever leaving it. One
          API. Full lifecycle.
        </p>
        {/* TODO: replace with contact form or Calendly */}
        <a
          href="mailto:hello@arcacover.com"
          className="cta-glow group mt-10 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
        >
          Talk to our team
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </a>
      </div>
    </section>
  );
}
