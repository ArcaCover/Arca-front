import { AlertTriangle } from "lucide-react";

import type { DebugMode, ModeCheck } from "@/lib/debug/mode-check";

const LABELS: Record<DebugMode, string> = {
  mock: "MOCK · no real APIs · in-memory data",
  // Only the scans and the assessments are real there: the webapp runs in the back's memory (DN-10 §10). Short enough
  // for one line beside the State button on a 390 px phone; SimulationNotice says the rest where it matters.
  "live-debug": "LIVE DEBUG · real scans · simulated accounts & billing",
};
// live-debug against a back started with WEBAPP_PROVIDERS=real (DN-13 §3.2, §8.4): Supabase Auth and Stripe in test mode, as
// /__debug/mode reports them (T19). As long as the simulated label, so it keeps to one phone line. The back cannot tell which
// Supabase project its URL names, so the strip does not name one. A combination the back does not build today is spelt out
// field by field, so it still reads true.
const REAL_WEBAPP_LABEL = "LIVE DEBUG · real scans · real accounts · Stripe test";

function matchLabel(check: Extract<ModeCheck, { state: "match" }>): string {
  if (check.mode === "mock" || (check.webapp === "simulated" && check.billing === "simulated")) return LABELS[check.mode];
  if (check.webapp === "real" && check.billing === "test") return REAL_WEBAPP_LABEL;
  return `LIVE DEBUG · real scans · ${check.webapp} accounts · ${check.billing === "test" ? "Stripe test" : "simulated billing"}`;
}

// Each state differs in shape as well as colour (DN-09 §6.2): stripes for mock, solid rojo for live-debug, inverted
// marino for a mismatch. The stripes are a pattern nothing else in the UI uses, drawn from the palette's variables.
const MOCK_STRIPES = {
  backgroundImage: "repeating-linear-gradient(135deg, var(--color-marino) 0px 4px, transparent 4px 14px)",
};

// `check` is null until the back answers. The strip then names the front's own mode, which the build fixed, in a
// neutral bruma that belongs to no mode: the stripes and the rojo are the modes' identity, so they wait for the back
// to confirm, as the text does. `armed` lists what the next scan injects, whatever the state (DN-09 §5.3).
export default function ModeBanner({
  front,
  check,
  armed = [],
}: {
  front: DebugMode;
  check: ModeCheck | null;
  armed?: readonly string[];
}) {
  const confirmed = check?.state === "match" ? check.mode : null;
  const mismatch = check?.state === "mismatch";
  const striped = confirmed === "mock";
  const tone = mismatch
    ? "bg-marino text-oro"
    : confirmed === "live-debug"
      ? "bg-rojo text-white"
      : confirmed === "mock"
        ? "bg-oro text-marino"
        : "bg-bruma text-marino";
  const label =
    check === null
      ? `Checking the back's mode · front=${front}`
      : check.state === "mismatch"
        ? check.label
        : matchLabel(check);
  return (
    <div
      data-arca-debug="arca-debug-sentinel-7f3c"
      role="status"
      // One 16px line plus py-1 is the 1.5rem /app reserves for the strip (app/app/layout.tsx). On a 390px phone the
      // State button leaves about 316px, so the text and padding shrink below sm to keep the live-debug label on it.
      className={`flex items-center justify-center gap-2 px-2 py-1 text-center font-body text-[11px] leading-4 font-semibold sm:px-4 sm:text-xs ${tone}`}
      style={striped ? MOCK_STRIPES : undefined}
    >
      {mismatch && <AlertTriangle className="size-4 shrink-0" />}
      <span className={striped ? "rounded-full bg-oro px-2" : undefined}>
        <span>{label}</span>
        {armed.length > 0 && <span>{` · next scan injects: ${armed.join(", ")}`}</span>}
      </span>
    </div>
  );
}
