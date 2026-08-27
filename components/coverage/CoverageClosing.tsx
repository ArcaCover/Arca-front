import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CoverageClosing() {
  return (
    <section className="bg-marino px-6 py-24 sm:px-8">
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <h2 className="text-pretty font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-white">
          Your malpractice policy wasn&rsquo;t built for AI. This one is.
        </h2>
        <p className="mt-5 max-w-[600px] text-pretty text-[18px] leading-relaxed text-white/80">
          See how your firm scores on AI governance and what coverage looks like for your
          practice.
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

        <p className="mt-6 text-[15px] text-white/70">
          Are you a broker?{" "}
          <Link
            href="/partners"
            className="font-semibold underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Partner with us
          </Link>
        </p>
      </div>
    </section>
  );
}
