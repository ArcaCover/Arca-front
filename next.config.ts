import type { NextConfig } from "next";
import { resolveArcaMode, resolveWebappEnabled } from "./lib/arca-mode";

// Validated on every `next dev` and `next build` (DN-09 §4). It goes through `env` so the mode is always inlined as a
// literal, production included: a NEXT_PUBLIC_* that is undefined at build time is not inlined, and then the debug
// branches could not fold away. The webapp flag (DN-13 §8.2) is inlined the same way, as "true" or "false".
const mode = resolveArcaMode(process.env);
const webappEnabled = resolveWebappEnabled(process.env, mode);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_ARCA_MODE: mode, NEXT_PUBLIC_WEBAPP_ENABLED: webappEnabled ? "true" : "false" },
};

export default nextConfig;
