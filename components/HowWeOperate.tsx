// TODO: confirm regulatory wording with counsel before launch
const BLOCKS = [
  {
    title: "Managing General Agent (MGA)",
    description:
      "We underwrite, issue, and service policies on behalf of the risk carrier.",
  },
  {
    title: "Surplus lines",
    description:
      "Specialized coverage for emerging AI risks, outside the standard admitted market.",
  },
  {
    title: "Building toward Lloyd's coverholder status",
    description:
      "We are working toward becoming an approved Lloyd's coverholder — an ongoing goal, not a status we hold today.",
  },
];

export default function HowWeOperate() {
  return (
    <section className="bg-marino px-6 py-14">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        {BLOCKS.map((block) => (
          <div key={block.title}>
            <h3 className="font-heading text-lg font-bold text-white">
              {block.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {block.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
