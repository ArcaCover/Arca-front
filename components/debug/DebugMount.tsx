"use client";

import dynamic from "next/dynamic";

// The comparison is written out here, against the inlined literal, on purpose: in a production build it folds to
// `null`, so the import below is dead code and the debug chunk is never emitted (DN-09 §6.1).
const DebugRoot =
  process.env.NEXT_PUBLIC_ARCA_MODE === "mock" || process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug"
    ? dynamic(() => import("./DebugRoot"), { ssr: false })
    : null;

export default function DebugMount() {
  return DebugRoot ? <DebugRoot /> : null;
}
