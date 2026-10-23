import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findDebugLeaks } from './check-no-debug.mjs';

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

  it('ignores source maps, whose original source keeps the strings a guarded bridge folds away', () => {
    mkdirSync(join(dir, 'server', 'chunks'), { recursive: true });
    writeFileSync(join(dir, 'server', 'chunks', 'client.js'), 'function headers(){return{}}');
    writeFileSync(join(dir, 'server', 'chunks', 'client.js.map'), '{"sourcesContent":["window.__arcaDebug?.publish(s, d)"]}');

    expect(findDebugLeaks(dir)).toEqual([]);
  });
});
