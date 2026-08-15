const PILLARS = [
  {
    title: "Plain-English coverage",
    description:
      "Policies written in language attorneys actually use — no jargon, no fine print games.",
  },
  {
    title: "Built for how AI fails in practice",
    description:
      "Coverage designed around the real ways AI creates exposure for a law firm — not a generic tech policy.",
  },
  {
    title: "A digital process, start to finish",
    description:
      "From assessment to bound policy, everything happens online, at the speed your firm needs.",
  },
];

export default function ValuePillars() {
  return (
    <section id="what-we-do" className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-medium tracking-tight text-marino md:text-5xl">
          What we do.
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-pretty text-center text-[18px] leading-[1.6] text-marino/80">
          Insurance built around how your practice actually uses AI — not
          adapted from a generic tech policy.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <div key={pillar.title} className="rounded-[1.75rem] bg-bruma p-8">
              <p className="font-heading text-sm font-medium text-marino/40">
                0{index + 1}
              </p>
              <h3 className="mt-6 font-heading text-2xl font-medium tracking-tight text-marino">
                {pillar.title}
              </h3>
              <p className="mt-3 leading-relaxed text-marino/80">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
