// Editorial hero: the headline holds the left column while two mini-cards sit
// at the bottom of a narrow right column, previewing how the page splits.
const BARS = {
  light: [
    { color: "bg-cielo", delay: "" },
    { color: "bg-cielo", delay: "[animation-delay:0.3s]" },
    { color: "bg-oro", delay: "[animation-delay:0.6s]" },
  ],
  dark: [
    { color: "bg-cielo/80", delay: "[animation-delay:0.15s]" },
    { color: "bg-oro", delay: "[animation-delay:0.45s]" },
    { color: "bg-cielo/80", delay: "[animation-delay:0.75s]" },
  ],
} as const;

function Bars({ tone }: { tone: keyof typeof BARS }) {
  return (
    <span aria-hidden className="ml-auto flex h-[26px] items-end gap-1">
      {BARS[tone].map((bar, index) => (
        <i
          key={index}
          className={`block h-[26px] w-[5px] origin-bottom rounded-[3px] ${bar.color} ${
            tone === "light" ? "cv-rise" : "cv-rise-slow"
          } ${bar.delay}`}
        />
      ))}
    </span>
  );
}

export default function CoverageHero() {
  return (
    // At the top of the page the navbar is transparent and the wordmark floats
    // large and centred over the hero, so this padding has to clear the
    // wordmark, not the 64px bar. The mockup had a placeholder bar with no
    // wordmark in it, which is why its 100px left the eyebrow crowding the
    // logo. Matches the other institutional heroes instead.
    <section className="relative mx-auto max-w-[1440px] px-6 pt-32 sm:px-[60px] sm:pt-40">
      <div
        aria-hidden
        className="cv-float pointer-events-none absolute right-20 top-5 hidden h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-cielo)_30%,transparent)_0%,color-mix(in_srgb,var(--color-bruma)_35%,transparent)_45%,transparent_70%)] blur-[18px] lg:block"
      />

      {/* Top-aligned, so the mini-cards start on the same line as the eyebrow
          and read as part of the composition. Bottom-aligning them left the
          top of the right column empty and the pair looked dropped in. */}
      <div className="relative grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <div>
          <div className="mb-[26px] flex items-center gap-3">
            <span aria-hidden className="block h-[2px] w-[34px] bg-oro-oscuro" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-oro-oscuro">
              AI Professional Malpractice
            </span>
          </div>
          <h1 className="max-w-[15ch] text-pretty font-heading text-[clamp(36px,6vw,68px)] font-medium leading-[1.02] tracking-[-0.035em] text-marino">
            Eight coverages for the risks AI creates in your practice.
          </h1>
          <p className="mt-[30px] max-w-[600px] text-pretty text-[19px] leading-[1.62] text-marino/75">
            One purpose-built policy that covers what happens when AI-assisted work goes
            wrong — from client harm to the costs your firm absorbs to make it right.
          </p>
        </div>

        <div className="flex flex-col gap-[14px]">
          <div className="card-on-canvas flex items-center gap-4 rounded-[22px] bg-white/[0.78] px-[22px] py-[18px]">
            <span className="font-heading text-[32px] font-medium leading-none text-marino">04</span>
            <span className="text-[13px] leading-[1.45] text-marino/70">
              Third-party
              <br />
              When AI errors reach your clients
            </span>
            <Bars tone="light" />
          </div>
          <div className="flex items-center gap-4 rounded-[22px] bg-marino px-[22px] py-[18px] shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--color-marino)_50%,transparent)]">
            <span className="font-heading text-[32px] font-medium leading-none text-oro">04</span>
            <span className="text-[13px] leading-[1.45] text-white/75">
              First-party
              <br />
              When the cost falls on your firm
            </span>
            <Bars tone="dark" />
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-[70px] h-px bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-marino)_16%,transparent),transparent)]"
      />
    </section>
  );
}
