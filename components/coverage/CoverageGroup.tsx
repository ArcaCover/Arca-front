import type { CoverageGroupContent } from "./coverage-details";

// One band of four coverages. Third-party and first-party share it: the only
// thing that changes is the header, the lead-in and the four cards.
export default function CoverageGroup({ group }: { group: CoverageGroupContent }) {
  return (
    <section id={group.id} className="scroll-mt-24 px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          {group.header}
        </h2>
        <p className="mx-auto mt-5 max-w-[640px] text-pretty text-center text-[18px] leading-relaxed text-marino/80">
          {group.description}
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {group.coverages.map((coverage) => (
            <article
              key={coverage.name}
              className="flex flex-col rounded-3xl bg-white p-8 shadow-sm sm:p-10"
            >
              <span aria-hidden className="block h-1 w-10 rounded-full bg-oro" />
              <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-marino">
                {coverage.name}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-marino/70">
                {coverage.description}
              </p>
              <p className="mt-6 border-t border-marino/10 pt-6 text-[15px] italic leading-relaxed text-marino/70">
                <span className="font-body text-[13px] font-semibold not-italic tracking-widest text-oro-oscuro">
                  IMAGINE THIS:
                </span>{" "}
                {coverage.scenario}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
