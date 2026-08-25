const STEPS = [
  {
    title: "Apply",
    body: "Submit a short request. We review your profile, license, and book.",
  },
  {
    title: "Get approved",
    body: "After a discovery call, approved partners get access to the dashboard.",
  },
  {
    title: "Start placing",
    body: "Scan firms, share reports, close coverage.",
  },
];

export default function PartnerSteps() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          From partner to placement
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, position) => (
            <li key={step.title}>
              <span className="font-heading text-sm font-semibold tracking-widest text-oro-oscuro">
                {String(position + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-heading text-xl font-medium tracking-tight text-marino">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-marino/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
