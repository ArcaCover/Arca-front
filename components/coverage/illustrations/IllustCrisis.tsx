// 07 — Crisis Management. A news card with the crisis counters arriving one
// after another beneath it.
const COUNTERS = [
  { value: "7", label: "Press inquiries", delay: "" },
  { value: "12", label: "Client calls", delay: "[animation-delay:0.6s]" },
  { value: "3", label: "Referrers", delay: "[animation-delay:1.2s]" },
];

export default function IllustCrisis() {
  return (
    <div className="flex w-[266px] flex-col gap-[10px]">
      <div className="rounded-xl bg-white px-[15px] py-[13px] shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--color-marino)_30%,black)]">
        <div className="flex items-center justify-between">
          <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-oro-oscuro">
            County Ledger · Legal
          </span>
          <span className="text-[8.5px] font-semibold text-marino/45">2h ago</span>
        </div>
        <span className="mt-[7px] block font-heading text-[13px] font-medium leading-[1.28] text-marino">
          Court finds injury firm&rsquo;s brief cited cases that do not exist
        </span>
      </div>
      <div className="flex gap-2">
        {COUNTERS.map((counter) => (
          <span
            key={counter.label}
            className={`cv-rowin flex-1 rounded-[10px] bg-white/[0.07] px-[10px] py-2 ${counter.delay}`}
          >
            <b className="block font-heading text-[14px] font-semibold text-oro">
              {counter.value}
            </b>
            <b className="mt-[2px] block text-[9px] font-semibold uppercase tracking-[0.08em] text-white/55">
              {counter.label}
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
