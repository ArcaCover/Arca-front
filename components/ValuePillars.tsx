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
    <section className="bg-bruma px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-bold text-marino md:text-4xl">
          What we do.
        </h2>
        <div className="mt-12 grid gap-10 text-center md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <h3 className="font-heading text-2xl font-bold text-marino">
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
