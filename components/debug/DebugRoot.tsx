"use client";

// Debug builds only: DebugMount loads this file in mock and live-debug, and a production build never emits it. The
// sentinel attribute is what the postbuild check looks for to prove that.
export default function DebugRoot() {
  const live = process.env.NEXT_PUBLIC_ARCA_MODE === "live-debug";
  return (
    <div
      data-arca-debug="arca-debug-sentinel-7f3c"
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] px-4 py-1 text-center font-body text-xs font-semibold ${
        live ? "bg-rojo text-white" : "bg-oro text-marino"
      }`}
    >
      {live ? "LIVE DEBUG · real APIs & real database" : "MOCK · no real APIs · in-memory data"}
    </div>
  );
}
