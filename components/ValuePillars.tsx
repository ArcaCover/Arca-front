const PILLARS = [
  {
    title: "Easy",
    description:
      "Get covered fully online, in plain language — no jargon, no fine print.",
  },
  {
    title: "Reliable",
    description: "Coverage designed specifically for the risks AI creates.",
  },
  {
    title: "Fast",
    description: "A fully digital process, built to move at the speed you do.",
  },
];

export default function ValuePillars() {
  return (
    <section id="what-we-do" className="bg-white px-6 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-medium tracking-tight text-marino md:text-5xl">
          What we do.
        </h2>
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
