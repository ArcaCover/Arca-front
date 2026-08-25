const DEVELOPMENTS = [
  {
    title: "AI adoption is accelerating",
    body: "Firms of every size are using AI to draft motions, review contracts, summarize depositions, and research case law. Tools like Harvey, CoCounsel, and Lexis+ AI are becoming part of daily practice — not experiments.",
  },
  {
    title: "Regulators are moving",
    body: "State bar associations and courts are writing AI-specific rules. Disclosure requirements, competence standards, supervision duties — the regulatory landscape is forming fast, and non-compliance is a disciplinary matter.",
  },
  {
    title: "Carriers are pulling back",
    body: "Traditional malpractice carriers are adding AI exclusions or sub-limiting AI-related claims. The coverage you've relied on for years may no longer protect you for how you work today.",
  },
];

// Left-aligned rather than centred like the numbered steps on /partners and
// /platforms: these read as an editorial briefing, not as three short steps.
export default function WhatsHappening() {
  return (
    <section className="px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-center font-heading text-[clamp(28px,3.6vw,40px)] font-medium leading-tight tracking-[-0.03em] text-marino">
          What&rsquo;s happening in legal
        </h2>

        <ol className="mt-14 space-y-12">
          {DEVELOPMENTS.map((item, position) => (
            <li
              key={item.title}
              className="grid gap-3 border-t border-marino/10 pt-8 md:grid-cols-[auto_1fr] md:gap-10"
            >
              <span className="font-heading text-sm font-semibold tracking-widest text-oro-oscuro md:pt-1">
                {String(position + 1).padStart(2, "0")}
              </span>
              <div className="max-w-[720px]">
                <h3 className="font-heading text-[22px] font-medium tracking-tight text-marino">
                  {item.title}
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-marino/70">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
