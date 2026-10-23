// The search behind scripts/check-no-debug.mjs (DN-09 6.1 and 8.9), kept apart so it can be imported without running
// the check.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Strings that only debug code carries.
// These live only in debug-only modules (components/debug and what only it imports), so no production module's
// source holds them: they are searched everywhere, source maps included.
const DEBUG_ONLY_MARKERS = [/arca-debug-sentinel-7f3c/, /\/__debug\//, /LIVE DEBUG/, /MODE MISMATCH/];
// These two are also in lib/debug/bridge.ts, which production pages import. Its body folds to `return` in a production
// build, but server source maps keep the module's original source, so in maps they would flag the bridge itself.
// They are searched in everything else, which is the code that ships. Header names may reach the bundle lowercased.
const BRIDGE_MARKERS = [/__arcaDebug/, /X-Arca-Debug-Scenario/i];

export function findDebugLeaks(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name))
    .filter(file => {
      const markers = file.endsWith('.map') ? DEBUG_ONLY_MARKERS : [...DEBUG_ONLY_MARKERS, ...BRIDGE_MARKERS];
      // latin1 reads any file, text or binary, without throwing on invalid UTF-8.
      const content = readFileSync(file, 'latin1');
      return markers.some(marker => marker.test(content));
    });
}
