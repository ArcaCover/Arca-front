import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function BuiltForPractice() {
  return (
    <section
      id="built-for-your-practice"
      className="scroll-mt-24 bg-marino px-6 py-24 sm:px-8"
    >
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h2 className="font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-white">
          Built for your practice
        </h2>
        <p className="mt-5 max-w-[600px] text-pretty text-[18px] leading-relaxed text-white/80">
          ARCA is the only coverage designed specifically for AI-related professional
          liability in legal practice. If you&rsquo;re using AI to serve your clients, we
          should talk.
        </p>

        <Link
          href="/quote"
          className="cta-glow group mt-10 inline-flex cursor-pointer items-center gap-3.5 rounded-full bg-oro py-2.5 pl-7 pr-2.5 font-heading text-[17px] font-medium tracking-tight text-marino transition-transform duration-200 hover:-translate-y-px"
        >
          Get a quote
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </Link>

        {/* TODO: link to /coverage when it exists */}
        <a
          href="#"
          className="mt-6 text-[15px] text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Or explore our coverage →
        </a>
      </div>
    </section>
  );
}
