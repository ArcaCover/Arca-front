// 05 — Error Remediation. A trust register where each document turns from
// pending to re-issued while the remediation bar fills.
const DOCS = [
  { id: "TR-2291 · executed Mar 4", delay: "" },
  { id: "TR-2314 · executed Apr 18", delay: "[animation-delay:0.5s]" },
  { id: "TR-2352 · executed May 2", delay: "[animation-delay:1s]" },
];

export default function IllustRemediation() {
  return (
    <div className="w-[258px] rounded-[14px] border border-cielo/[0.18] bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
          Trust register · beneficiary clause
        </span>
        <span className="font-heading text-[11px] font-semibold text-oro">34 docs</span>
      </div>
      <div className="flex flex-col gap-2">
        {DOCS.map((doc) => (
          <span
            key={doc.id}
            className="grid grid-cols-[1fr_auto] items-center gap-[10px] text-[10.5px] text-white/78"
          >
            {doc.id}
            <b
              className={`cv-fixed rounded-full px-[9px] py-[3px] text-[9px] font-bold uppercase tracking-[0.08em] ${doc.delay}`}
            >
              Re-issued
            </b>
          </span>
        ))}
      </div>
      <div className="mt-[14px] flex items-center gap-[10px]">
        <span className="block h-[5px] flex-1 overflow-hidden rounded-[3px] bg-cielo/[0.18]">
          <i className="cv-fill block h-full origin-left bg-oro" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/50">
          31 clients notified
        </span>
      </div>
    </div>
  );
}
