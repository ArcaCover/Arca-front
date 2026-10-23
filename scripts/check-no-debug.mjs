// Fails a production build that ships any debug code (DN-09 6.1 and 8.9). Runs as `postbuild`.
// Usage: node scripts/check-no-debug.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Strings that only debug code carries. Header names may reach the bundle lowercased.
const MARKERS = [/arca-debug-sentinel-7f3c/, /__arcaDebug/, /X-Arca-Debug-Scenario/i, /\/__debug\//, /LIVE DEBUG/, /MODE MISMATCH/];

// Source maps are skipped: they carry the original source of every module, so the bridge shows its guarded strings
// there even when the compiled code folded them away. What ships is the compiled code, and that is what is searched.
export function findDebugLeaks(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !entry.name.endsWith('.map'))
    .map(entry => join(entry.parentPath, entry.name))
    .filter(file => {
      // latin1 reads any file, text or binary, without throwing on invalid UTF-8.
      const content = readFileSync(file, 'latin1');
      return MARKERS.some(marker => marker.test(content));
    });
}

// The same rule as lib/arca-mode.ts, which a plain Node script cannot import.
const MODES = ['production', 'live-debug', 'mock'];
function resolveArcaMode(env) {
  const mode = env.NEXT_PUBLIC_ARCA_MODE || 'production';
  if (!MODES.includes(mode)) throw new Error(`NEXT_PUBLIC_ARCA_MODE="${mode}" is not a mode; use one of ${MODES.join(', ')}`);
  if (mode !== 'production' && env.VERCEL !== undefined) throw new Error(`NEXT_PUBLIC_ARCA_MODE=${mode} is local-only and cannot build on Vercel`);
  return mode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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
}
