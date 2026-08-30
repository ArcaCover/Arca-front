// 03 — AI Bias & Discrimination. An intake queue where the two Region B rows
// dim while their scores flip to a flagged state.
const ROWS = [
  { name: "M. Okonjo · Region A", score: "88", flagged: false, delay: "" },
  { name: "J. Ruiz · Region A", score: "81", flagged: false, delay: "" },
  { name: "S. Haddad · Region B", score: "34", flagged: true, delay: "" },
  { name: "A. Nabil · Region B", score: "31", flagged: true, delay: "[animation-delay:0.4s]" },
];

export default function IllustBias() {
  return (
    <div className="w-[266px] overflow-hidden rounded-xl bg-white shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--color-marino)_70%,transparent)]">
      <div className="grid grid-cols-[1fr_56px] gap-[10px] bg-bruma px-[14px] py-[9px] text-[8.5px] font-bold uppercase tracking-[0.1em] text-marino/60">
        <span>Intake queue · Form I-589</span>
        <span className="text-right">AI score</span>
      </div>
      {ROWS.map((row, index) => (
        <div
          key={row.name}
          className={`grid grid-cols-[1fr_56px] items-center gap-[10px] px-[14px] py-[9px] text-[10.5px] text-marino/78 ${
            index > 0 ? "border-t border-marino/[0.07]" : ""
          } ${row.flagged ? `cv-biasdim ${row.delay}` : ""}`}
        >
          <span>{row.name}</span>
          {row.flagged ? (
            <span
              className={`cv-flag justify-self-end rounded-full px-2 py-[2px] font-bold text-marino ${row.delay}`}
            >
              {row.score}
            </span>
          ) : (
            <span className="text-right font-bold">{row.score}</span>
          )}
        </div>
      ))}
    </div>
  );
}
