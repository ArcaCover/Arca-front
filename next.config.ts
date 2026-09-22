import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// @arca/contracts is linked from the sibling Arca-back checkout while the package is not
// published yet, so it resolves through a symlink that points outside this project. Turbopack
// will not resolve past its own root, so the root is lifted to the folder holding both repos
// and the package is transpiled from source. Once @arcacover/contracts is on GitHub Packages
// this whole block goes away: an installed dependency needs none of it.
const nextConfig: NextConfig = {
  transpilePackages: ["@arca/contracts"],
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
};

export default nextConfig;
