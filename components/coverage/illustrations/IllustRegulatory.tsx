// 02 — AI Regulatory Sanctions. A state bar document with the notice of
// discipline landing on it like a stamp.
export default function IllustRegulatory() {
  return (
    <div className="relative w-[252px] rounded-[14px] bg-white px-[18px] pb-5 pt-4 shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--color-marino)_50%,transparent)]">
      <div className="flex flex-col gap-[10px]">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-marino">
          State bar · office of chief trial counsel
        </span>
        <i className="block h-[6px] w-full rounded-[3px] bg-cielo/30" />
        <i className="block h-[6px] w-[88%] rounded-[3px] bg-cielo/30" />
        <i className="block h-[6px] w-[54%] rounded-[3px] bg-cielo/30" />
      </div>
      <span className="cv-stamp absolute -bottom-4 -right-3 rounded-[10px] bg-oro px-[13px] py-[9px] font-heading text-[10.5px] font-semibold uppercase tracking-[0.12em] text-marino shadow-[0_12px_26px_-14px_color-mix(in_srgb,var(--color-marino)_60%,transparent)]">
        Notice of discipline
      </span>
    </div>
  );
}
