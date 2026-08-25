const REASONS = [
  {
    title: "A product that doesn't exist yet",
    body: "No carrier offers dedicated AI malpractice coverage for law firms. You're not competing on price — you're the only one with this.",
  },
  {
    title: "Leads that come pre-qualified",
    body: "Every firm that runs an assessment gets an AI risk score. You receive leads with data, not cold names.",
  },
  {
    title: "Your own dashboard",
    body: "Scan firms in your book, share white-label reports with your branding, and track every lead from link to placement.",
  },
  {
    title: "Competitive commission",
    body: "We reward partners who build with us early. Reach out to learn more.",
  },
];

export default function WhyPartner() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          Why partner with us
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <div key={reason.title} className="rounded-3xl bg-white p-8 shadow-sm sm:p-10">
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
