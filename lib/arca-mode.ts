// The front's build-time mode (DN-09 §4): the API's three ARCA_MODE values, plus `demo`, which is the front's alone.
// next.config.ts resolves it once and inlines it as a literal, so code must compare process.env.NEXT_PUBLIC_ARCA_MODE at
// each site rather than import a mode from here.
//
// `demo` answers every API call in the browser from a recording of the mock back (lib/demo/), so the whole product can be
// clicked through with no back and no real data. It is the mode of the `dev` branch's Vercel preview, where the founder
// works on the UX, and it can never build for production.
export const ARCA_MODES = ["production", "live-debug", "mock", "demo"] as const;
export type ArcaMode = (typeof ARCA_MODES)[number];
/** The branch whose Vercel previews run live-debug: pilot.arcacover.com. */
export const PILOT_BRANCH = "pilot";

/** The branch whose Vercel previews build in demo without anyone setting a variable. */
export const DEMO_BRANCH = "dev";

export function resolveArcaMode(env: Record<string, string | undefined>): ArcaMode {
  const onDemoPreview = env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === DEMO_BRANCH;
  const value = env.NEXT_PUBLIC_ARCA_MODE || (onDemoPreview ? "demo" : "production");
  const mode = ARCA_MODES.find(known => known === value);
  // A typo never falls into a mode by accident: it stops the build or the dev server.
  if (mode === undefined) {
    throw new Error(`NEXT_PUBLIC_ARCA_MODE="${value}" is not a mode; use one of ${ARCA_MODES.join(", ")}`);
  }
  // Every Vercel build, preview or production, defines VERCEL; mock needs a local back and is local-only. live-debug is too,
  // with one exception: a preview of the branch named pilot, behind its password and its API's access token (DN-14 §5 in
  // Arca-back). No debug mode ever builds for Vercel production.
  const pilot = mode === "live-debug" && env.VERCEL_GIT_COMMIT_REF === PILOT_BRANCH && env.VERCEL_ENV !== "production";
  if ((mode === "mock" || mode === "live-debug") && env.VERCEL !== undefined && !pilot) {
    throw new Error(`NEXT_PUBLIC_ARCA_MODE=${mode} is local-only and cannot build on Vercel`);
  }
  // The demo may run on a preview, never on the production deployment.
  if (mode === "demo" && env.VERCEL !== undefined && env.VERCEL_ENV !== "preview") {
    throw new Error("NEXT_PUBLIC_ARCA_MODE=demo builds only on a Vercel preview, never for production");
  }
  return mode;
}

/**
 * Whether the build runs the private webapp on the real accounts (DN-13 §3.2, §8.2). Production keeps the webapp hidden
 * until the back is turned on (§7.6 step 4); live-debug uses it against a back started with WEBAPP_PROVIDERS=real. Like the
 * mode, next.config.ts resolves it once and inlines it, so a typo, or a mock build that asks for real accounts (the back
 * refuses that combination too), stops the build instead of shipping a webapp no one can sign in to.
 */
export function resolveWebappEnabled(env: Record<string, string | undefined>, mode: ArcaMode): boolean {
  const value = env.NEXT_PUBLIC_WEBAPP_ENABLED || "false";
  if (value !== "true" && value !== "false") {
    throw new Error(`NEXT_PUBLIC_WEBAPP_ENABLED="${value}" must be true or false`);
  }
  if (value === "true" && mode === "mock") {
    throw new Error("NEXT_PUBLIC_WEBAPP_ENABLED=true needs real accounts, and mock never uses a real service; unset it for mock");
  }
  return value === "true";
}
