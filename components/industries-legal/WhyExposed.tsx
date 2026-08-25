const EXPOSURES = [
  {
    title: "Fiduciary duty",
    body: "Lawyers owe the highest standard of care to their clients. When AI makes a mistake in your work product, the duty — and the liability — is still yours.",
  },
  {
    title: "Privilege at stake",
    body: "Feeding client data into AI tools creates exposure that didn't exist before. A privilege breach through an AI platform is a malpractice event and a disciplinary risk.",
  },
  {
    title: "The bar is watching",
    body: "Unlike most professions, lawyers answer to state bar associations with enforcement power. AI-related complaints are a new category — and bars are building the framework to handle them.",
  },
  {
    title: "No precedent, no playbook",
    body: "AI malpractice in legal practice has almost no case history. That means carriers can't price it well, defense strategies are untested, and firms are flying blind.",
  },
];

export default function WhyExposed() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Why legal is uniquely exposed
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {EXPOSURES.map((exposure) => (
            <div key={exposure.title} className="rounded-3xl bg-white p-8 shadow-sm sm:p-10">
              <span aria-hidden className="block h-1 w-10 rounded-full bg-oro" />
              <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-marino">
                {exposure.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-marino/70">{exposure.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
