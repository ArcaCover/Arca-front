// Records what the mock back answers along the whole product, for the front-only demo mode (lib/demo/).
// Usage, with `npm run stack -- mock` running in Arca-back:  npm run demo:record
// It walks the funnel as a visitor (quote → scan → score → assessment → results → sign-up → payment → every /app page),
// then signs in as each role of the seeded organization and opens every page again. Every request to the API and its
// answer land in lib/demo/recording.json, which the demo replays in the browser. Run it again whenever the back changes.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '../../Arca-back/node_modules/playwright/index.mjs';
import { DEBUG_PRESETS, DebugScenario } from '@arca/contracts/debug';

const frontendUrl = process.env.ARCA_FRONTEND_URL ?? 'http://localhost:3000';
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const out = path.resolve('lib/demo/recording.json');
const STEP_MS = 90_000;

const APP_PAGES = ['/app', '/app/analyses', '/app/action-plan', '/app/monitoring', '/app/coverage', '/app/documents',
  '/app/members', '/app/billing', '/app/settings', '/app/activity', '/app/help'];

const mode = await fetch(`${apiUrl}/__debug/mode`).then(response => response.json()).catch(() => null);
if (mode?.mode !== 'mock') {
  console.error(`The back at ${apiUrl} is not in mock. Start it with \`npm run stack -- mock\` in Arca-back.`);
  process.exit(1);
}

// A clean back: no scan left over from earlier runs, and the scan rate limit back at zero.
await fetch(`${apiUrl}/__debug/reset`, { method: 'POST', headers: { 'X-Arca-Debug': '1' } });

// 0. The scenarios the debug panel offers (its presets and the mock firms), each scanned once through the back and kept
// apart from the story below: the demo serves one when the panel picks it (lib/demo/replay.ts). Only the scan and its
// result are kept, so /quote/scanning and /score show the scenario; its assessment is not part of the demo.
const FIRMS = {
  minimal: { label: 'Minimal evidence', domain: 'minimal.arca.example' },
  sanctioned: { label: 'Sanctioned attorney', domain: 'sanctioned.arca.example' },
  partial_sources: { label: 'Partial sources', domain: 'partial.arca.example' },
  blocked: { label: 'Website blocks us', domain: 'blocked.arca.example' },
  down: { label: 'Website down', domain: 'down.arca.example' },
  failed: { label: 'Scan fails on our side', domain: 'failed.arca.example' },
};
const asExchange = (method, requestPath, status, body) =>
  ({ method, path: requestPath, auth: null, requestBody: null, status, contentType: 'application/json', body, encoding: 'json' });
async function recordScenario(key, label, kind, domain, scenario) {
  const headers = { 'Content-Type': 'application/json', ...(scenario ? { 'X-Arca-Debug-Scenario': JSON.stringify(scenario) } : {}) };
  const start = await fetch(`${apiUrl}/scan`, { method: 'POST', headers,
    body: JSON.stringify({ email: `demo+${key}@arca.example`, domain }) });
  const started = await start.json();
  const exchanges = [asExchange('POST', '/scan', start.status, started)];
  if (start.ok) {
    let response, body;
    for (let attempt = 0; attempt < 240; attempt++) {
      response = await fetch(`${apiUrl}/scan/${encodeURIComponent(started.scanId)}`, { headers: { Authorization: `Bearer ${started.sessionToken}` } });
      body = await response.json().catch(() => null);
      if (response.status !== 200 || body?.status !== 'RUNNING') break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    exchanges.push(asExchange('GET', `/scan/${encodeURIComponent(started.scanId)}`, response.status, body));
  }
  console.log(`  scenario ${key}: ${exchanges.map(exchange => exchange.status).join(' → ')}`);
  return { label, kind, domain, scenario: scenario ?? null, exchanges };
}
const scenarios = {};
for (const [key, preset] of Object.entries(DEBUG_PRESETS)) {
  scenarios[key] = await recordScenario(key, preset.label, 'preset', 'robust.arca.example', DebugScenario.parse(preset.scenario));
}
// The mock back allows ten scans an hour: a reset between the two groups, and another before the story starts.
await fetch(`${apiUrl}/__debug/reset`, { method: 'POST', headers: { 'X-Arca-Debug': '1' } });
for (const [key, firm] of Object.entries(FIRMS)) scenarios[key] = await recordScenario(key, firm.label, 'firm', firm.domain, null);
await fetch(`${apiUrl}/__debug/reset`, { method: 'POST', headers: { 'X-Arca-Debug': '1' } });

const entries = [];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });

async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  // Every API call goes through here: forwarded to the back, recorded, then handed to the page. A listener on responses
  // loses the bodies of those that land while the page navigates, as the payment's do.
  await context.route(`${apiUrl}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const response = await route.fetch();
    const keep = request.method() !== 'OPTIONS' && !/^\/__debug\/(mode|scan\/|reset)/.test(url.pathname);
    if (keep) {
      const contentType = response.headers()['content-type'] ?? '';
      const buffer = await response.body();
      const json = contentType.includes('json');
      entries.push({
        method: request.method(),
        path: url.pathname + url.search,
        auth: request.headers().authorization ?? null,
        requestBody: request.postData() ?? null,
        status: response.status(),
        contentType,
        headers: Object.fromEntries(Object.entries(response.headers())
          .filter(([name]) => ['content-disposition', 'retry-after'].includes(name))),
        body: json ? JSON.parse(buffer.toString('utf8') || 'null') : buffer.toString('base64'),
        encoding: json ? 'json' : 'base64',
      });
    }
    await route.fulfill({ response });
  });
  return page;
}

const onPath = pathname => url => url.pathname === pathname;
const step = text => console.log(`  · ${text}`);
const settle = page => page.waitForLoadState('networkidle').catch(() => {});

// Answers whatever question is on screen the way a person would: the suggestion if there is one, else the first choice.
async function answerAll(page) {
  for (let step = 0; step < 40; step++) {
    await settle(page);
    await page.waitForTimeout(700);
    if (await page.getByRole('heading', { name: 'One last look.' }).isVisible()) return;
    const suggestion = page.getByRole('button', { name: 'Use this answer' });
    if (await suggestion.isVisible()) await suggestion.click();
    else if (await page.locator('label:has(input[type=radio]), label:has(input[type=checkbox])').count()) {
      const open = page.locator('textarea#text-answer');
      if (await open.isVisible()) await open.fill('A filing deadline missed because of a wrong date.');
      else await page.locator('label:has(input[type=radio]), label:has(input[type=checkbox])').first().click();
    } else if (await page.getByRole('spinbutton').isVisible()) {
      const min = (await page.getByRole('spinbutton').getAttribute('min')) ?? '1';
      await page.getByRole('spinbutton').fill(String(Math.max(Number(min), 5)));
    } else {
      const scale = page.locator('button[aria-pressed]').last();
      if (await scale.isVisible()) await scale.click();
    }
    const next = page.getByRole('button', { name: 'Continue', exact: true });
    await next.click({ timeout: 10_000 });
  }
  throw new Error('The assessment never reached its review');
}

async function visitApp(page, label) {
  for (const route of APP_PAGES) {
    // A page that redirects on load (the payment return lands on /app and moves on) aborts the first navigation: try again.
    await page.goto(`${frontendUrl}${route}`).catch(async () => { await page.waitForTimeout(1500); await page.goto(`${frontendUrl}${route}`); });
    await settle(page);
    await page.waitForTimeout(800);
  }
  const detail = page.locator('a[href*="/app/analyses/"]').first();
  if (await detail.count()) {
    await detail.click();
    await settle(page);
  }
  console.log(`  ${label}: ${APP_PAGES.length} pages and an analysis`);
}

// 1. A scan slow enough to be seen running. Only its first poll is kept: the demo shows it while it pretends to scan. A
// scan with an injected delay cannot be claimed, so the funnel below runs a scan of its own at full speed.
let scanning;
{
  const page = await newPage();
  await page.addInitScript(() => sessionStorage.setItem('arca.debug.scenario', JSON.stringify({ latency: 'normal' })));
  await page.goto(`${frontendUrl}/quote`);
  await page.getByLabel('Work email').fill('you@robust.arca.example');
  await page.getByLabel('Firm website').fill('robust.arca.example');
  const first = entries.length;
  await page.getByRole('button', { name: 'Scan my firm' }).click();
  await page.waitForURL(onPath('/score'), { timeout: STEP_MS });
  const polls = entries.slice(first).filter(entry => entry.method === 'GET' && /^\/scan\/[^/]+$/.test(entry.path));
  scanning = polls.find(entry => entry.body?.status !== 'completed')?.body ?? null;
  entries.splice(first);
  if (!scanning) throw new Error('The slow scan never answered while running');
  step('scanning sample');
  await page.context().close();
}

// 2. The visitor's whole funnel.
{
  const page = await newPage();
  await page.goto(`${frontendUrl}/quote`);
  await page.getByLabel('Work email').fill('you@robust.arca.example');
  await page.getByLabel('Firm website').fill('robust.arca.example');
  await page.getByRole('button', { name: 'Scan my firm' }).click();
  await page.waitForURL(onPath('/score'), { timeout: STEP_MS });
  await settle(page);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
    page.getByRole('button', { name: /Download report \(PDF\)/ }).click(),
  ]);
  if (!download) console.warn('  the Quick Scan Report did not download');
  await page.getByRole('button', { name: 'Refine your score' }).click();
  await page.waitForURL(onPath('/assessment'));
  step('assessment');
  await answerAll(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'See my score' }).click();
  await page.waitForURL(onPath('/assessment/results'));
  step('results');
  await settle(page);
  await page.getByRole('button', { name: 'Activate your account' }).click();
  await page.waitForURL(onPath('/app/signup')).catch(async error => {
    if (process.env.DEMO_FAIL_SHOT) await page.screenshot({ path: process.env.DEMO_FAIL_SHOT, fullPage: true });
    throw error;
  });
  step('sign-up');
  // The pre-checkout's five steps (You, Your firm, Plan, Verify email, Payment), simulated as in mock.
  const next = () => page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Full name').fill('Jordan Smith');
  await page.locator('input[name=contactRole]').first().check({ force: true });
  await next();
  await page.getByLabel('Firm legal name').fill('Robust Law LLP');
  await page.getByLabel('Street address').fill('100 Main St');
  await page.getByLabel('City').fill('Miami');
  await page.locator('select[autocomplete="address-level1"]').selectOption('FL');
  await page.getByLabel('ZIP code').fill('33101');
  await page.locator('input[name=attorneyRange]').first().check({ force: true });
  await page.getByPlaceholder('Find a state').fill('Florida');
  await page.locator('label:has-text("Florida") input[type=checkbox]').first().check({ force: true });
  await next();
  await page.locator('input[name=plan]').first().check({ force: true });
  await next();
  await page.getByRole('button', { name: 'Create my account' }).click();
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.waitForURL(onPath('/app/billing/mock-checkout'));
  step('checkout');
  await page.getByRole('button', { name: 'Simulated payment' }).click();
  await page.waitForURL(url => url.pathname === '/app' && url.searchParams.get('paid') === '1');
  await visitApp(page, 'visitor after paying');
  await page.context().close();
}

// 3. The seeded organization, through each of its users, as the demo's role switch signs in.
const seed = await fetch(`${apiUrl}/__debug/seed`, { method: 'POST', headers: { 'X-Arca-Debug': '1' } }).then(r => r.json());
for (const user of seed.users) {
  const page = await newPage();
  await page.goto(`${frontendUrl}/app/login`);
  await page.evaluate(async ({ api, user, orgId }) => {
    const headers = { 'Content-Type': 'application/json', 'X-Arca-Debug': '1' };
    await fetch(`${api}/__debug/seed`, { method: 'POST', headers: { 'X-Arca-Debug': '1' } });
    const login = await fetch(`${api}/__debug/auth/login`, { method: 'POST', headers,
      body: JSON.stringify({ email: user.email, platformAdmin: user.role === 'platform_admin' || undefined }) }).then(r => r.json());
    localStorage.setItem('arca.app.session', JSON.stringify({ token: login.token, email: login.user.email, expiresAt: login.expiresAt }));
    if (user.role !== 'platform_admin') localStorage.setItem('arca.app.org', orgId);
  }, { api: apiUrl, user, orgId: seed.organization.id });
  if (user.role === 'platform_admin') {
    await page.goto(`${frontendUrl}/app/admin`);
    await settle(page);
    console.log('  platform admin: /app/admin');
  } else {
    await visitApp(page, user.role);
  }
  await page.context().close();
}

await browser.close();
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ recordedAt: new Date().toISOString(), seed, scanning, scenarios, entries }, null, 1)}\n`);
console.log(`${entries.length} API exchanges recorded in ${path.relative(process.cwd(), out)}`);
