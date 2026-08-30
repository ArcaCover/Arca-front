// 01 — AI Work Product Errors. A table of authorities where the third citation
// is struck through and flagged as a case that does not exist.
export default function IllustWorkProduct() {
  return (
    <div className="relative w-[258px] rounded-[14px] bg-white px-[18px] py-4 shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--color-marino)_50%,transparent)]">
      <div className="flex flex-col gap-[11px]">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-marino/40">
          Table of authorities
        </span>
        <span className="flex items-center gap-[9px] text-[11px] text-marino/75">
          <i className="block h-[5px] w-[5px] rounded-full bg-cielo" />
          Reyes v. Calder, 214 F.3d 118
        </span>
        <span className="flex items-center gap-[9px] text-[11px] text-marino/75">
          <i className="block h-[5px] w-[5px] rounded-full bg-cielo" />
          In re Whitmore, 88 Cal. App. 4th 51
        </span>
        <span className="relative flex items-center gap-[9px] text-[11px] text-marino/75">
          <i className="block h-[5px] w-[5px] rounded-full bg-oro" />
          Nolan v. Briggs, 402 U.S. 77
          <i className="cv-strike absolute inset-x-0 left-[14px] h-[2px] origin-left rounded-[2px] bg-oro-oscuro" />
        </span>
      </div>
      <span className="cv-badge absolute -bottom-[14px] -right-[10px] rounded-full bg-oro px-3 py-[7px] text-[10px] font-bold uppercase tracking-[0.1em] text-marino shadow-[0_10px_24px_-12px_color-mix(in_srgb,var(--color-marino)_60%,transparent)]">
        No such case
      </span>
    </div>
  );
}
