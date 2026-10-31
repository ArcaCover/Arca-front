import type { NextConfig } from "next";
import { resolveArcaMode } from "./lib/arca-mode";

// Validated on every `next dev` and `next build` (DN-09 §4). It goes through `env` so the mode is always inlined as a
// literal, production included: a NEXT_PUBLIC_* that is undefined at build time is not inlined, and then the debug
// branches could not fold away.
const mode = resolveArcaMode(process.env);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_ARCA_MODE: mode },
};

export default nextConfig;
