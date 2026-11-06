import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

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
  // The first lint loads the config, the parser and the plugins, which alone can pass the 5 s test timeout on a busy
  // machine (DN-10 §12.2). It is paid here, under its own limit, so the cases below time only themselves.
  beforeAll(() => eslint.lintText('', { filePath: 'lib/warm-up.ts' }), 60_000);

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
    // DN-11 §6.4: from a nested folder a relative path reaches the debug folders without naming lib/ or components/.
    ['lib/app/access.ts', 'import { installDebugStore } from "../debug/store";'],
    ['lib/app/access.ts', 'export const store = () => import("../debug/store");'],
    ['components/app/shell/Sidebar.tsx', 'import StatePanel from "../../debug/StatePanel";'],
    ['components/Navbar.tsx', 'export const Banner = () => import("./debug/ModeBanner");'],
    // A template literal has no source.value, so the boundary reads its text instead.
    ['lib/app/access.ts', 'export const store = () => import(`../debug/store`);'],
    ['app/layout.tsx', 'export const Root = () => import(`@/components/debug/DebugRoot`);'],
    ['lib/api/client.ts', 'export const presets = () => import(`@arca/contracts/debug`);'],
    ['lib/app/access.ts', 'export const tool = (name) => import(`../debug/${name}`);'],
  ])('refuses a production module (%s) that imports debug-only code', async (filePath, source) => {
    expect(await importErrors(filePath, source)).toHaveLength(1);
  });

  // A path put together at run time cannot be read by the rule, so outside the debug folders import() takes a literal:
  // each of these reaches a debug module, or may, past a check of the path's text.
  const BUILT_PATHS = [
    'import("../debug/" + "store")',
    'import(`@/components/${"debug"}/DebugRoot`)',
    'import(`../debug/bridge${"/../store"}`)',
    'import(`../debug/bridge${x}`)',
    'import(`${x}/debug/store`)',
    'import(`../${x}/store`)',
  ];
  it.each(['lib/app/access.ts', 'app/layout.tsx'].flatMap(filePath => BUILT_PATHS.map(path => [filePath, path])))(
    'refuses a production module (%s) a dynamic import built at run time: %s',
    async (filePath, path) => {
      expect(await importErrors(filePath, `export const load = (x) => ${path};`))
        .toEqual([expect.stringContaining('import() takes a literal path')]);
    },
  );

  it('lets a production module import a literal path of its own', async () => {
    const source = 'export const Checkout = () => import("./MockCheckout");';
    expect(await importErrors('app/app/billing/mock-checkout/page.tsx', source)).toEqual([]);
  });

  it.each([
    ['app/layout.tsx', 'import DebugMount from "@/components/debug/DebugMount";'],
    ['app/quote/page.tsx', 'import { publishDebugState } from "@/lib/debug/bridge";'],
    ['lib/api/client.ts', 'import { takeDebugScenarioHeaders } from "@/lib/debug/bridge";'],
    ['app/score/page.tsx', 'import { Layer1Result } from "@arca/contracts";'],
    ['app/layout.tsx', 'export const Mount = () => import("@/components/debug/DebugMount");'],
    ['app/layout.tsx', 'export const Mount = () => import(`@/components/debug/DebugMount`);'],
    ['lib/app/access.ts', 'export const bridge = () => import(`../debug/bridge`);'],
    ['lib/app/access.ts', 'import { showForbidden, subscribeShowForbidden } from "../debug/bridge";'],
    ['lib/app/access.ts', 'import { showForbidden } from "@/lib/debug/bridge";'],
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
