import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// @arca/contracts is consumed over `file:../Arca-back/packages/contracts` until it is
// published, so it resolves through a symlink pointing outside this project and Turbopack
// will not resolve past its own root. Lifting the root to the folder that holds both repos
// is the whole workaround, and it goes away once the package is installed from a registry.
//
// The package used to declare a `development` export condition for the backend's tsx, which
// bundlers switch on by themselves in dev: Next then loaded its raw TypeScript source, whose
// re-exports use .js specifiers that only exist after a build, and every route that touched
// the contracts went to 500 — while `next build` passed, because production takes the
// `default` condition and gets dist/. The backend's condition is now named `arca-source`, so
// nothing claims it by accident and both modes resolve the built entry.
//
// Consequence while this lasts: changes in packages/contracts need `npm run build` in
// Arca-back before the frontend sees them.
const nextConfig: NextConfig = {
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
};

export default nextConfig;
