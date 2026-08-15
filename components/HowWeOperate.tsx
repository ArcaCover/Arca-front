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
    <section className="bg-canvas px-3 pb-6 md:px-4 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[2rem] bg-marino p-10 md:grid-cols-3 md:rounded-[2.5rem] md:p-16">
        {BLOCKS.map((block) => (
          <div key={block.title}>
            <h3 className="font-heading text-lg font-medium tracking-tight text-white">
              {block.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {block.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
