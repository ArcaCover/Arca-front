const STEPS = [
  {
    title: "Connect",
    body: "Get API credentials and access to our sandbox. Test scoring, quoting, and binding in a staging environment before going live.",
  },
  {
    title: "Build",
    body: "Use our RESTful API and documentation to embed the flow into your platform. We provide SDKs, webhooks, and a dedicated integration engineer.",
  },
  {
    title: "Go live",
    body: "Launch to your users. Every policy placed through your platform is tracked and attributed. You earn revenue on each placement.",
  },
];

export default function IntegrationSteps() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          How integration works
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, position) => (
            <li key={step.title} className="text-center">
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
