// TODO: confirm regulatory wording with counsel before launch
const BLOCKS = [
  {
    title: "Managing General Agent (MGA)",
    description:
      "Arca underwrites, issues, and manages every policy on behalf of the insurance carrier that assumes the risk.",
  },
  {
    title: "Surplus lines",
    description:
      "Because AI risk is new and still evolving, our coverage is placed in the surplus lines market — built for risks the standard market hasn't caught up to yet.",
  },
  {
    title: "Building toward Lloyd's coverholder status",
    description:
      "We are working toward Lloyd's coverholder status — a goal we're pursuing, not a status we hold today.",
  },
];

export default function HowWeOperate() {
  return (
    <section className="px-3 pb-6 md:px-4 md:pb-8">
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
