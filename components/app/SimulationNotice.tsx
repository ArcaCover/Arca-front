import { simulatedWebappNotice } from "@/lib/debug/bridge";

// One line where someone signs up, signs in or pays in live-debug: the scan behind the screen is real, and the account and
// the payment are not. The text lives in the bridge, past its literal guard, so this renders nothing in mock or in
// production. The label below is this file's own, so the same literal guard stands here: without it a production build
// carried the label in every chunk that imports this component.
export default function SimulationNotice({ className = "mt-4" }: { className?: string }) {
  if (process.env.NEXT_PUBLIC_ARCA_MODE !== "live-debug") return null;
  const text = simulatedWebappNotice();
  if (!text) return null;
  return (
    <p
      role="note"
      aria-label="About this simulation"
      className={`${className} rounded-xl border border-dashed border-marino/30 bg-bruma/60 px-3 py-2 text-xs leading-5 text-marino/80`}
    >
      {text}
    </p>
  );
}
