const CAPABILITIES = [
  {
    title: "Score",
    body: "Run an AI risk assessment on any firm. Return a score, risk tier, and exposure breakdown — in seconds, from your own interface.",
  },
  {
    title: "Quote",
    body: "Generate a coverage quote based on the firm's score, practice area, size, and state. Real pricing, real terms, displayed where your users already work.",
  },
  {
    title: "Bind",
    body: "Let firms accept coverage and bind a policy without leaving your platform. Digital signature, instant confirmation.",
  },
  {
    title: "Manage",
    body: "Surface policy status, renewal dates, and claims filing to your users. Their coverage lives inside the tool they already use every day.",
  },
];

// The one dark section of the page: the four API surfaces read as a technical
// block rather than more marketing.
export default function WhatYouCanBuild() {
  return (
    <section className="bg-marino px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-white">
          What you can build
        </h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10"
            >
              <span aria-hidden className="block h-1 w-10 rounded-full bg-oro" />
              <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-white">
                {capability.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">
                {capability.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
