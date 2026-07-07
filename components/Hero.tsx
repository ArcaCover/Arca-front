import { ArrowRight } from "lucide-react";

const INDUSTRIES = [
  "Law firms",
  "Independent lawyers",
  "Accounting firms",
  "Independent accountants",
  "Consulting firms",
  "Independent consultants",
];

export default function Hero() {
  return (
    <section id="top" className="bg-white px-3 pt-3 md:px-4 md:pt-4">
      <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-marino px-6 py-28 text-center md:rounded-[2.5rem]">
        {/* Decorative background: CSS-only soft sky arcs and glows on marino */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-24rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full border border-cielo/20" />
          <div className="absolute left-1/2 top-[-28rem] h-[54rem] w-[54rem] -translate-x-1/2 rounded-full border border-cielo/10" />
          <div className="absolute bottom-[-14rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cielo/10 blur-3xl" />
          <div className="absolute bottom-[-16rem] left-[-12rem] h-[30rem] w-[30rem] rounded-full bg-cielo/5 blur-3xl" />
        </div>
        <h1 className="relative mx-auto max-w-4xl animate-fade-up font-heading text-4xl font-medium leading-tight tracking-tight text-white md:text-7xl">
          Insurance for businesses that rely on AI.
        </h1>
        <p className="relative mx-auto mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-white/75 [animation-delay:150ms]">
          When your work depends on AI, new risks come with it — from model
          failures to liability for automated decisions. Arca covers them:
          simple, reliable, and fast.
        </p>
        <div className="relative mt-10 flex animate-fade-up flex-col items-center gap-6 [animation-delay:300ms] sm:flex-row">
          <a
            href="#get-a-quote"
            className="group inline-flex items-center gap-3 rounded-full bg-oro py-2 pl-7 pr-2 text-base font-bold text-marino transition-colors hover:bg-oro-oscuro"
          >
            Get a quote
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </a>
          <a
            href="#what-we-do"
            className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-opacity hover:opacity-75"
          >
            How it works
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </a>
        </div>
      </div>

      {/* Industries marquee — decorative; industries remain reachable in the nav */}
      <div aria-hidden="true" className="overflow-hidden py-7">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-14 pr-14">
              {INDUSTRIES.map((industry) => (
                <span
                  key={industry}
                  className="whitespace-nowrap font-heading text-lg font-medium tracking-tight text-marino/40"
                >
                  {industry}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
