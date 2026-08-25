const SEGMENTS = [
  {
    title: "Small to midsize firms",
    body: "Solo practitioners to 50-attorney firms. The firms where one AI mistake can become a firm-wide problem — and where a coverage gap hits hardest.",
  },
  {
    title: "AI-forward practice areas",
    body: "Litigation, immigration, criminal defense, personal injury, corporate — any area where AI tools are part of drafting, research, or client-facing work.",
  },
  {
    title: "Licensed in the U.S.",
    body: "Starting with Florida, Texas, California, and New York. Expanding state by state.",
  },
];

export default function WhoWeWorkWith() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Who we work with
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-center text-[18px] leading-relaxed text-marino/80">
          We work with U.S. law firms that are already using AI in their practice and want
          coverage that actually reflects how they work today.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {SEGMENTS.map((segment) => (
            <div key={segment.title} className="rounded-3xl bg-white p-8 shadow-sm">
              <span aria-hidden className="block h-1 w-10 rounded-full bg-oro" />
              <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-marino">
                {segment.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-marino/70">{segment.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
