// Fails a production build that ships any debug code (DN-09 6.1 and 8.9). `npm run build` runs it after `next build`.
// Usage: node scripts/check-no-debug.mjs
// It runs unconditionally: there is no "am I the entry point" guard to compare paths, which could turn false through a
// symlink or junction and pass the build silently. The search lives in debug-leaks.mjs, which tests import.
import { existsSync, readFileSync } from 'node:fs';
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

// `next build` also takes the mode from .env files, so the check has to read them the same way or it would scan a
// debug build as production. Same order as Next for a production build; a variable set in the shell always wins.
const ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];
function modeFromEnvFiles(root) {
  for (const file of ENV_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const line = readFileSync(path, 'utf8').split(/\r?\n/).find(text => /^\s*NEXT_PUBLIC_ARCA_MODE\s*=/.test(text));
    if (line !== undefined) return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return undefined;
}

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = resolveArcaMode({ ...process.env,
  NEXT_PUBLIC_ARCA_MODE: process.env.NEXT_PUBLIC_ARCA_MODE ?? modeFromEnvFiles(root) });
if (mode !== 'production') {
  console.log(`[check-no-debug] skipped (mode=${mode})`);
} else {
  const leaks = ['static', 'server'].flatMap(dir => findDebugLeaks(join(root, '.next', dir)));
  console.log(`[check-no-debug] ${leaks.length} debug leak(s) in the production build`);
  for (const leak of leaks) console.log(`  ${leak}`);
  if (leaks.length > 0) process.exit(1);
}
