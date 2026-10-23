import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// The debug boundary (DN-09 §6.1): production code reaches the debug tools through DebugMount and the bridge only, both
// of which fold to nothing in a production build. Anything else it imported from the debug folders, or the debug
// contract, would ship in the production bundle, and the leak check only knows a handful of strings.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd: ROOT });

async function importErrors(filePath, source) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter(message => ['no-restricted-imports', 'no-restricted-syntax'].includes(message.ruleId))
    .map(message => message.message);
}

describe('debug import boundary', () => {
  it.each([
    ['app/quote/page.tsx', 'import StatePanel from "@/components/debug/StatePanel";'],
    ['app/score/page.tsx', 'import { tokenTimes } from "@/lib/debug/token";'],
    ['components/score/Gauge.tsx', 'import { installDebugStore } from "../../lib/debug/store";'],
    ['components/Navbar.tsx', 'import ModeBanner from "./debug/ModeBanner";'],
    ['lib/api/client.ts', 'import { DEBUG_PRESETS } from "@arca/contracts/debug";'],
    ['app/quote/page.tsx', 'export { DEBUG_PRESETS } from "@arca/contracts/debug";'],
    // no-restricted-imports does not look at import(), so the boundary covers it separately.
    ['app/layout.tsx', 'export const Root = () => import("@/components/debug/DebugRoot");'],
    ['lib/api/client.ts', 'export const presets = () => import("@arca/contracts/debug");'],
  ])('refuses a production module (%s) that imports debug-only code', async (filePath, source) => {
    expect(await importErrors(filePath, source)).toHaveLength(1);
  });

  it.each([
    ['app/layout.tsx', 'import DebugMount from "@/components/debug/DebugMount";'],
    ['app/quote/page.tsx', 'import { publishDebugState } from "@/lib/debug/bridge";'],
    ['lib/api/client.ts', 'import { takeDebugScenarioHeaders } from "@/lib/debug/bridge";'],
    ['app/score/page.tsx', 'import { Layer1Result } from "@arca/contracts";'],
    ['app/layout.tsx', 'export const Mount = () => import("@/components/debug/DebugMount");'],
  ])('lets a production module (%s) import the two entry points and the public contract', async (filePath, source) => {
    expect(await importErrors(filePath, source)).toEqual([]);
  });

  it.each([
    ['components/debug/StatePanel.tsx', 'import { DebugScanState } from "@arca/contracts/debug";\nimport { tokenTimes } from "@/lib/debug/token";'],
    ['lib/debug/mode-check.ts', 'import { DebugModeResponse } from "@arca/contracts/debug";'],
  ])('lets debug code (%s) import the debug modules and the debug contract', async (filePath, source) => {
    expect(await importErrors(filePath, source)).toEqual([]);
  });
});
