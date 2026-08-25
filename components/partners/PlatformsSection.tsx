import { ArrowRight } from "lucide-react";

export default function PlatformsSection() {
  return (
    <section id="platforms" className="scroll-mt-24 bg-marino px-6 py-24 sm:px-8">
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h2 className="font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-white">
          For legal platforms
        </h2>
        <p className="mt-5 max-w-[600px] text-pretty text-[18px] leading-relaxed text-white/80">
          Integrate AI risk scoring into your platform. Give your users real-time
          visibility into their AI exposure — powered by ARCA&rsquo;s scoring engine.
        </p>
        {/* TODO: replace with contact form */}
        <a
          href="mailto:hello@arcacover.com"
          className="cta-glow group mt-10 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
        >
          Start a conversation
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </a>
      </div>
    </section>
  );
}
