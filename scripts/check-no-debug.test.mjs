import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findDebugLeaks } from './debug-leaks.mjs';

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
    ['the live-debug label', 'LIVE DEBUG · real APIs & real database'],
    ['the mismatch label', 'MODE MISMATCH · front=mock'],
  ])('reports a source map that carries %s, which only debug-only modules hold', (_name, source) => {
    const map = join(dir, 'server', 'chunks', 'ssr', 'page.js.map');
    mkdirSync(join(dir, 'server', 'chunks', 'ssr'), { recursive: true });
    writeFileSync(map, JSON.stringify({ sourcesContent: [source] }));

    expect(findDebugLeaks(dir)).toEqual([map]);
  });

  it('skips, in source maps only, the two names the guarded bridge keeps in its original source', () => {
    mkdirSync(join(dir, 'server', 'chunks'), { recursive: true });
    writeFileSync(join(dir, 'server', 'chunks', 'client.js'), 'function headers(){return{}}');
    writeFileSync(
      join(dir, 'server', 'chunks', 'client.js.map'),
      JSON.stringify({ sourcesContent: ['window.__arcaDebug?.publish(s, d); return { "X-Arca-Debug-Scenario": s };'] }),
    );

    expect(findDebugLeaks(dir)).toEqual([]);
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

  it('skips a debug build', () => {
    writeFileSync(join(root, '.next', 'static', 'chunks', 'debug.js'), '<div data-arca-debug="arca-debug-sentinel-7f3c">');

    const result = run(join(root, 'scripts', 'check-no-debug.mjs'), 'mock');

    expect(result.stdout).toContain('[check-no-debug] skipped (mode=mock)');
    expect(result.status).toBe(0);
  });
});
