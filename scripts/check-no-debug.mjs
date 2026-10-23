// Fails a production build that ships any debug code (DN-09 6.1 and 8.9). `npm run build` runs it after `next build`.
// Usage: node scripts/check-no-debug.mjs
// It runs unconditionally: there is no "am I the entry point" guard to compare paths, which could turn false through a
// symlink or junction and pass the build silently. The search lives in debug-leaks.mjs, which tests import.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findDebugLeaks } from './debug-leaks.mjs';

// The same rule as lib/arca-mode.ts, which a plain Node script cannot import.
const MODES = ['production', 'live-debug', 'mock'];
function resolveArcaMode(env) {
  const mode = env.NEXT_PUBLIC_ARCA_MODE || 'production';
  if (!MODES.includes(mode)) throw new Error(`NEXT_PUBLIC_ARCA_MODE="${mode}" is not a mode; use one of ${MODES.join(', ')}`);
  if (mode !== 'production' && env.VERCEL !== undefined) throw new Error(`NEXT_PUBLIC_ARCA_MODE=${mode} is local-only and cannot build on Vercel`);
  return mode;
}

const mode = resolveArcaMode(process.env);
if (mode !== 'production') {
  console.log(`[check-no-debug] skipped (mode=${mode})`);
} else {
  const root = fileURLToPath(new URL('../.next/', import.meta.url));
  const leaks = ['static', 'server'].flatMap(dir => findDebugLeaks(join(root, dir)));
  console.log(`[check-no-debug] ${leaks.length} debug leak(s) in the production build`);
  for (const leak of leaks) console.log(`  ${leak}`);
  if (leaks.length > 0) process.exit(1);
}
