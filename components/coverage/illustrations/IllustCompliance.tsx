// 08 — Regulatory Compliance Costs. A mandated governance checklist filling
// in, item by item, against a three-week clock.
const ITEMS = [
  { label: "Written AI use policy", delay: "" },
  { label: "Human review log", delay: "[animation-delay:1.1s]" },
  { label: "Outside consultant sign-off", delay: "[animation-delay:2.2s]" },
];

export default function IllustCompliance() {
  return (
    <div className="w-[258px] rounded-[14px] border border-cielo/[0.18] bg-white/5 p-4">
      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
        Mandated AI governance audit
      </span>
      <div className="mt-[13px] flex flex-col gap-[9px]">
        {ITEMS.map((item) => (
          <span key={item.label} className={`cv-check flex items-center gap-[10px] ${item.delay}`}>
            <i className="block h-[14px] w-[14px] rounded-[4px] bg-oro" />
            <span className="text-[10.5px] text-white/78">{item.label}</span>
          </span>
        ))}
      </div>
      <div className="mt-[14px] flex items-center gap-[10px]">
        <span className="block h-[5px] flex-1 overflow-hidden rounded-[3px] bg-cielo/[0.18]">
          <i className="cv-fill block h-full origin-left bg-oro" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/50">
          Week 3 of 3
        </span>
      </div>
    </div>
  );
}
