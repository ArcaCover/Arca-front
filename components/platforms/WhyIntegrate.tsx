const REASONS = [
  {
    title: "New revenue, zero underwriting",
    body: "You earn on every policy placed through your platform. ARCA handles underwriting, compliance, and claims. You handle distribution.",
  },
  {
    title: "A feature your competitors don't have",
    body: "No legal tech platform offers embedded AI liability coverage today. This is a category-first integration.",
  },
  {
    title: "Your users are asking",
    body: "Law firms using AI tools need coverage. If they can't get it inside your platform, they'll find it somewhere else — or worse, they won't get it at all.",
  },
];

export default function WhyIntegrate() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Why integrate
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {REASONS.map((reason) => (
            <div key={reason.title} className="rounded-3xl bg-white p-8 shadow-sm">
              <span aria-hidden className="block h-1 w-10 rounded-full bg-oro" />
              <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-marino">
                {reason.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-marino/70">{reason.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
