"use client";

import dynamic from "next/dynamic";

// The comparisons are written out here, against the inlined literal, on purpose: in a production build they fold to
// `null`, so the imports below are dead code and neither the debug chunk nor the demo's is emitted (DN-09 §6.1).
const DebugRoot =
  process.env.NEXT_PUBLIC_ARCA_MODE === "mock" || process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug"
    ? dynamic(() => import("./DebugRoot"), { ssr: false })
    : null;

const DemoBar =
  process.env.NEXT_PUBLIC_ARCA_MODE === "demo" ? dynamic(() => import("./DemoBar"), { ssr: false }) : null;
// The demo's debug strip, folding into a tab at the top right, beside the DemoBar pill at the bottom.
const DemoDebugRoot =
  process.env.NEXT_PUBLIC_ARCA_MODE === "demo" ? dynamic(() => import("./DemoDebugRoot"), { ssr: false }) : null;

export default function DebugMount() {
  if (DemoBar && DemoDebugRoot) {
    return (
      <>
        <DemoDebugRoot />
        <DemoBar />
      </>
    );
  }
  return DebugRoot ? <DebugRoot /> : null;
}
