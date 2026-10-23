import path from "node:path";
import type { NextConfig } from "next";
import { resolveArcaMode } from "./lib/arca-mode";

// Validated on every `next dev` and `next build` (DN-09 §4). It goes through `env` so the mode is always inlined as a
// literal, production included: a NEXT_PUBLIC_* that is undefined at build time is not inlined, and then the debug
// branches could not fold away.
const mode = resolveArcaMode(process.env);

const nextConfig: NextConfig = {
  // This isolated prototype consumes contracts from the paired sibling checkout.
  // Turbopack must be able to resolve that symlink outside the frontend directory.
  turbopack: { root: path.resolve(process.cwd(), "..") },
  env: { NEXT_PUBLIC_ARCA_MODE: mode },
};

export default nextConfig;
