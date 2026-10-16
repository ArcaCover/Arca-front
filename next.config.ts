import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This isolated prototype consumes contracts from the paired sibling checkout.
  // Turbopack must be able to resolve that symlink outside the frontend directory.
  turbopack: { root: path.resolve(process.cwd(), "..") },
};

export default nextConfig;
