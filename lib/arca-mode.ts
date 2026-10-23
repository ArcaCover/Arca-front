// The front's build-time mode (DN-09 §4): the same three values as the API's ARCA_MODE. next.config.ts resolves it
// once and inlines it as a literal, so code must compare process.env.NEXT_PUBLIC_ARCA_MODE at each site rather than
// import a mode from here.
export const ARCA_MODES = ["production", "live-debug", "mock"] as const;
export type ArcaMode = (typeof ARCA_MODES)[number];

export function resolveArcaMode(env: Record<string, string | undefined>): ArcaMode {
  const value = env.NEXT_PUBLIC_ARCA_MODE || "production";
  const mode = ARCA_MODES.find(known => known === value);
  // A typo never falls into a mode by accident: it stops the build or the dev server.
  if (mode === undefined) {
    throw new Error(`NEXT_PUBLIC_ARCA_MODE="${value}" is not a mode; use one of ${ARCA_MODES.join(", ")}`);
  }
  // Every Vercel build, preview or production, defines VERCEL; the debug modes are local-only.
  if (mode !== "production" && env.VERCEL !== undefined) {
    throw new Error(`NEXT_PUBLIC_ARCA_MODE=${mode} is local-only and cannot build on Vercel`);
  }
  return mode;
}
