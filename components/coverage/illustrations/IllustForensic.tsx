// 06 — AI Forensic Investigation. An audit window travelling down the docket
// rows, stopping on each one.
const FILINGS = [
  { id: "2:24-cv-01187 · motion to compel", note: "3 cites", flagged: true },
  { id: "2:24-cv-00934 · opposition brief", note: "clear", flagged: false },
  { id: "1:24-cv-02260 · summary judgment", note: "1 cite", flagged: true },
];

export default function IllustForensic() {
  return (
    <div className="w-[258px] rounded-[14px] border border-cielo/[0.18] bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
          Docket audit · Jan – Jun
        </span>
        <span className="font-heading text-[11px] font-semibold text-oro">214 filings</span>
      </div>
      <div className="relative mt-3">
        <span className="cv-vscan absolute -left-2 -right-2 top-0 h-[25px] rounded-lg border border-oro/50 bg-oro/[0.14]" />
        <div className="relative flex flex-col gap-[9px]">
          {FILINGS.map((filing) => (
            <span
              key={filing.id}
              className="grid h-4 grid-cols-[1fr_auto] items-center gap-[10px] text-[10.5px] text-white/78"
            >
              {filing.id}
              <b
                className={`text-[9.5px] font-bold ${filing.flagged ? "text-oro" : "text-white/45"}`}
              >
                {filing.note}
              </b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
