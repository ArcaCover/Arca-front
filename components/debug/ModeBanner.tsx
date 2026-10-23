import { AlertTriangle } from "lucide-react";

import type { DebugMode, ModeCheck } from "@/lib/debug/mode-check";

const LABELS: Record<DebugMode, string> = {
  mock: "MOCK · no real APIs · in-memory data",
  "live-debug": "LIVE DEBUG · real APIs & real database",
};

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
        : LABELS[check.mode];
  return (
    <div
      data-arca-debug="arca-debug-sentinel-7f3c"
      role="status"
      className={`flex items-center justify-center gap-2 px-4 py-1 text-center font-body text-xs font-semibold ${tone}`}
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
