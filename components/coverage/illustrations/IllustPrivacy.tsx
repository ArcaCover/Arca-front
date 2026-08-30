// 04 — AI Privacy & Confidentiality Breach. A fragment of a client document
// crossing the dashed channel into the model provider's reply.
export default function IllustPrivacy() {
  return (
    <div className="relative flex items-stretch gap-[26px]">
      <div className="flex w-[118px] flex-col gap-[7px] rounded-xl bg-white p-3 shadow-[0_12px_26px_-16px_color-mix(in_srgb,var(--color-marino)_60%,transparent)]">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-marino/40">
          Your firm
        </span>
        <span className="text-[10px] leading-[1.35] text-marino/75">
          Custody agreement — Ruiz
        </span>
        <i className="block h-[5px] w-full rounded-[3px] bg-cielo/[0.32]" />
        <i className="block h-[5px] w-[70%] rounded-[3px] bg-cielo/[0.32]" />
      </div>
      <div className="flex w-[118px] flex-col gap-[7px] rounded-xl bg-marino p-3">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/50">
          Model provider
        </span>
        <span className="text-[10px] leading-[1.35] text-white/72">
          Reply to another user
        </span>
        <i className="block h-[5px] w-[82%] rounded-[3px] bg-cielo/35" />
        <i className="cv-leak-bar block h-[5px] w-[46%] rounded-[3px] bg-oro" />
      </div>
      <span className="cv-dash absolute -bottom-[6px] -top-[6px] left-1/2 -ml-[0.5px] w-px" />
      <span className="cv-leak absolute left-[112px] top-1/2 -mt-[7px] h-[14px] w-[14px] rounded-[4px] bg-oro shadow-[0_6px_14px_-6px_color-mix(in_srgb,var(--color-marino)_70%,transparent)]" />
    </div>
  );
}
