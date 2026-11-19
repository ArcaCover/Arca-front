import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findDebugLeaks, findSecretLeaks } from './debug-leaks.mjs';

describe('findDebugLeaks', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'arca-no-debug-'));
    mkdirSync(join(dir, 'static', 'chunks'), { recursive: true });
    writeFileSync(join(dir, 'static', 'chunks', 'page.js'), 'export default function Page(){return "Get a quote"}');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('finds nothing in a clean build', () => {
    expect(findDebugLeaks(dir)).toEqual([]);
  });

  it('lists every file, however deep, that carries a debug marker', () => {
    const sentinel = join(dir, 'static', 'chunks', 'debug.js');
    const header = join(dir, 'server', 'app', 'quote.js');
    mkdirSync(join(dir, 'server', 'app'), { recursive: true });
    writeFileSync(sentinel, '<div data-arca-debug="arca-debug-sentinel-7f3c">');
    writeFileSync(header, 'headers:{"x-arca-debug-scenario":s}');

    expect(findDebugLeaks(dir).sort()).toEqual([sentinel, header].sort());
  });

  it.each([
    ['the sentinel', 'data-arca-debug="arca-debug-sentinel-7f3c"'],
    ['a debug route', 'fetch(`${base}/__debug/mode`)'],
    ['the live-debug label', 'LIVE DEBUG · real scans · simulated accounts & billing'],
    ['what the live-debug label says of the webapp', 'real scans · simulated accounts & billing'],
    ['the mismatch label', 'MODE MISMATCH · front=mock'],
  ])('reports a source map that carries %s, which only debug-only modules hold', (_name, source) => {
    const map = join(dir, 'server', 'chunks', 'ssr', 'page.js.map');
    mkdirSync(join(dir, 'server', 'chunks', 'ssr'), { recursive: true });
    writeFileSync(map, JSON.stringify({ sourcesContent: [source] }));

    expect(findDebugLeaks(dir)).toEqual([map]);
  });

  it('skips, in source maps only, the names the guarded bridge keeps in its original source', () => {
    mkdirSync(join(dir, 'server', 'chunks'), { recursive: true });
    writeFileSync(join(dir, 'server', 'chunks', 'client.js'), 'function headers(){return{}}');
    writeFileSync(
      join(dir, 'server', 'chunks', 'client.js.map'),
      JSON.stringify({ sourcesContent: [
        'window.__arcaDebug?.publish(s, d); return { "X-Arca-Debug-Scenario": s };',
        'return sessionStorage.getItem("arca.debug.showForbidden") === "1";',
        'return "Simulated in live-debug: this account and its payment are held in memory for this debug session and reset when the API restarts.";',
        '<p role="note" aria-label="About this simulation">',
      ] }),
    );

    expect(findDebugLeaks(dir)).toEqual([]);
  });

  // DN-10 §10: the line the live-debug screens show sits past the bridge's guard, so it must fold away like the rest.
  it('reports a shipped chunk that still carries the live-debug simulation notice', () => {
    const chunk = join(dir, 'static', 'chunks', 'app.js');
    writeFileSync(chunk, 'function n(){return"Simulated in live-debug: this account and its payment are held in memory for this debug session and reset when the API restarts."}');

    expect(findDebugLeaks(dir)).toEqual([chunk]);
  });

  // The note that shows that line has a label of its own, in a component production pages import: it must fold away too.
  it('reports a shipped chunk that still carries the label of the simulation notice', () => {
    const chunk = join(dir, 'static', 'chunks', 'app.js');
    writeFileSync(chunk, 'return t?(0,s.jsx)("p",{role:"note","aria-label":"About this simulation",children:t}):null');

    expect(findDebugLeaks(dir)).toEqual([chunk]);
  });

  // DN-11 §6.4: the switch's storage key is the bridge's, so it flags only code that ships; the panel's role tools and the
  // seeded users' domain are debug-only, so they flag a source map too.
  it('reports a shipped chunk that still reads the switch of forbidden controls', () => {
    const chunk = join(dir, 'static', 'chunks', 'app.js');
    writeFileSync(chunk, 'function s(){return sessionStorage.getItem("arca.debug.showForbidden")==="1"}');

    expect(findDebugLeaks(dir)).toEqual([chunk]);
  });

  it.each([
    ['the switch label', '<label>Show forbidden actions</label>'],
    ['the seed button', '<button>Seed demo organization</button>'],
    ['a seeded user', 'signIn("owner@demo.arca.example")'],
  ])('reports %s in a shipped chunk and in a source map', (_name, source) => {
    const chunk = join(dir, 'static', 'chunks', 'panel.js');
    const map = join(dir, 'server', 'chunks', 'ssr', 'panel.js.map');
    mkdirSync(join(dir, 'server', 'chunks', 'ssr'), { recursive: true });
    writeFileSync(chunk, source);
    writeFileSync(map, JSON.stringify({ sourcesContent: [source] }));

    expect(findDebugLeaks(dir).sort()).toEqual([chunk, map].sort());
  });
});

// DN-13 §8.2: no server secret may reach the bundle, in any mode. The keys are built here from their parts so this file
// holds no string that looks like a real one.
const SECRET_SAMPLES = [
  ['a Supabase secret key', `${'sb_'}secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`],
  ['a Stripe live key', `${'sk_'}live_${'4eC39HqLyjWDarjtT1zdp7dc'}`],
  ['a Stripe test key', `${'sk_'}test_${'51Hx9aBcDeFgHiJkLmNoPqRs'}`],
  ['a restricted live key', `${'rk_'}live_${'51Hx9aBcDeFgHiJkLmNoPqRs'}`],
  ['a restricted test key', `${'rk_'}test_${'51Hx9aBcDeFgHiJkLmNoPqRs'}`],
  ['a webhook secret', `${'whsec_'}${'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'}`],
];

describe('findSecretLeaks', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'arca-no-secret-'));
    mkdirSync(join(dir, 'static', 'chunks'), { recursive: true });
    // supabase-js names the prefix to refuse a secret key in the browser: a mention is not a key.
    writeFileSync(join(dir, 'static', 'chunks', 'supabase.js'),
      "const n=e=>e.startsWith('sb_publishable_')||e.startsWith('sb_secret_');/* whsec_ sk_test_ rk_live_ */");
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('finds nothing where the prefixes are only named', () => {
    expect(findSecretLeaks(dir)).toEqual([]);
  });

  it.each(SECRET_SAMPLES)('reports %s in a shipped chunk and in a source map', (_name, key) => {
    const chunk = join(dir, 'static', 'chunks', 'app.js');
    const map = join(dir, 'server', 'app', 'page.js.map');
    mkdirSync(join(dir, 'server', 'app'), { recursive: true });
    writeFileSync(chunk, `const k="${key}";`);
    writeFileSync(map, JSON.stringify({ sourcesContent: [`process.env.X ?? "${key}"`] }));

    expect(findSecretLeaks(dir).sort()).toEqual([chunk, map].sort());
  });
});

describe('the build script', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  // DN-09 §12.3: the check runs inside `build`, not in a `postbuild` hook, which `ignore-scripts=true` skips silently.
  it('runs the debug leak check as part of `build`, with no postbuild hook', () => {
    expect(scripts.build).toContain('check-no-debug.mjs');
    expect(scripts.build).toBe('next build && node scripts/check-no-debug.mjs');
    expect(scripts).not.toHaveProperty('postbuild');
  });
});

// The CLI is run against a copy of itself next to a fixture `.next`, since it always checks the `.next` beside its own
// scripts directory.
const CHECKER_FILES = ['check-no-debug.mjs', 'debug-leaks.mjs'];
const SCRIPTS_DIR = fileURLToPath(new URL('.', import.meta.url));

describe('check-no-debug CLI', () => {
  let base;
  let root;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'arca-no-debug-cli-'));
    root = join(base, 'front');
    mkdirSync(join(root, 'scripts'), { recursive: true });
    for (const file of CHECKER_FILES) copyFileSync(join(SCRIPTS_DIR, file), join(root, 'scripts', file));
    mkdirSync(join(root, '.next', 'static', 'chunks'), { recursive: true });
    mkdirSync(join(root, '.next', 'server', 'app'), { recursive: true });
    writeFileSync(join(root, '.next', 'static', 'chunks', 'page.js'), 'export default function Page(){return "Get a quote"}');
    writeFileSync(join(root, '.next', 'server', 'app', 'page.js'), 'module.exports={}');
  });

  afterEach(() => rmSync(base, { recursive: true, force: true }));

  function run(script, mode) {
    const env = { ...process.env };
    delete env.VERCEL;
    delete env.NEXT_PUBLIC_ARCA_MODE;
    if (mode !== undefined) env.NEXT_PUBLIC_ARCA_MODE = mode;
    return spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
  }

  it('passes a clean production build', () => {
    const result = run(join(root, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('0 debug leak(s) in the production build');
    expect(result.status).toBe(0);
  });

  it('fails a production build that ships debug code, also when its path goes through a junction or symlink', () => {
    writeFileSync(join(root, '.next', 'static', 'chunks', 'debug.js'), '<div data-arca-debug="arca-debug-sentinel-7f3c">');
    const link = join(base, 'linked-front');
    symlinkSync(root, link, 'junction');

    const result = run(join(link, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('1 debug leak(s) in the production build');
    expect(result.stdout).toContain('debug.js');
    expect(result.status).toBe(1);
  });

  it('fails a build that carries a secret key, and names the file but never the key', () => {
    const [, key] = SECRET_SAMPLES[0];
    writeFileSync(join(root, '.next', 'static', 'chunks', 'env.js'), `const k="${key}";`);

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('1 secret key(s) in the build');
    expect(result.stdout).toContain('env.js');
    expect(result.stdout).not.toContain(key);
    expect(result.status).toBe(1);
  });

  it('looks for secret keys in a debug build too', () => {
    const [, key] = SECRET_SAMPLES[5];
    writeFileSync(join(root, '.next', 'server', 'app', 'env.js'), `module.exports="${key}"`);

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'), 'mock');

    expect(result.stdout).toContain('1 secret key(s) in the build');
    expect(result.status).toBe(1);
  });

  it('reports no secret key in a clean build', () => {
    const result = run(join(root, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('[check-no-debug] 0 secret key(s) in the build');
  });

  it('skips a debug build', () => {
    writeFileSync(join(root, '.next', 'static', 'chunks', 'debug.js'), '<div data-arca-debug="arca-debug-sentinel-7f3c">');

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'), 'mock');

    expect(result.stdout).toContain('[check-no-debug] skipped (mode=mock)');
    expect(result.status).toBe(0);
  });

  // `next build` reads the mode from .env files too, so the check has to agree with it or a mode kept in
  // .env.local would fail every local build with false leaks.
  it('takes the mode from .env.local like next build does', () => {
    writeFileSync(join(root, '.next', 'static', 'chunks', 'debug.js'), '<div data-arca-debug="arca-debug-sentinel-7f3c">');
    writeFileSync(join(root, '.env.local'), '# local\nNEXT_PUBLIC_API_URL=http://localhost:8080\nNEXT_PUBLIC_ARCA_MODE="mock"\n');

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('[check-no-debug] skipped (mode=mock)');
    expect(result.status).toBe(0);
  });

  it('lets the shell win over the .env files, as next build does', () => {
    writeFileSync(join(root, '.env.local'), 'NEXT_PUBLIC_ARCA_MODE=mock\n');

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'), 'production');

    expect(result.stdout).toContain('0 debug leak(s) in the production build');
    expect(result.status).toBe(0);
  });

  it('reads .env.production.local before .env.local, .env.production and .env', () => {
    writeFileSync(join(root, '.env'), 'NEXT_PUBLIC_ARCA_MODE=Broken\n');
    writeFileSync(join(root, '.env.production'), 'NEXT_PUBLIC_ARCA_MODE=Broken\n');
    writeFileSync(join(root, '.env.local'), 'NEXT_PUBLIC_ARCA_MODE=Broken\n');
    writeFileSync(join(root, '.env.production.local'), 'NEXT_PUBLIC_ARCA_MODE=live-debug\n');

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'));

    expect(result.stdout).toContain('[check-no-debug] skipped (mode=live-debug)');
    expect(result.status).toBe(0);
  });
});
