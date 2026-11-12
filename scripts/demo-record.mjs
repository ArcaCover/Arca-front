// Records what the mock back answers along the whole product, for the front-only demo mode (lib/demo/).
// Usage, with `npm run stack -- mock` running in Arca-back:  npm run demo:record
// It walks the funnel as a visitor (quote → scan → score → assessment → results → sign-up → payment → every /app page),
// then signs in as each role of the seeded organization and opens every page again. Every request to the API and its
// answer land in lib/demo/recording.json, which the demo replays in the browser. Run it again whenever the back changes.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '../../Arca-back/node_modules/playwright/index.mjs';

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
      await page.locator('label:has(input[type=radio]), label:has(input[type=checkbox])').first().click();
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
    await page.goto(`${frontendUrl}${route}`);
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
    page.getByRole('button', { name: /Download Quick Scan Report/ }).click(),
  ]);
  if (!download) console.warn('  the Quick Scan Report did not download');
  await page.getByRole('button', { name: 'Refine your score' }).click();
  await page.waitForURL(onPath('/assessment'));
  step('assessment');
  await answerAll(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'See my demo score' }).click();
  await page.waitForURL(onPath('/assessment/results'));
  step('results');
  await settle(page);
  await page.getByRole('button', { name: 'Save your results and activate your account' }).click();
  await page.waitForURL(onPath('/app/signup')).catch(async error => {
    if (process.env.DEMO_FAIL_SHOT) await page.screenshot({ path: process.env.DEMO_FAIL_SHOT, fullPage: true });
    throw error;
  });
  step('sign-up');
  await page.getByLabel('Organization name').fill('Robust Law');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await page.waitForURL(onPath('/app/billing'));
  await settle(page);
  await page.goto(`${frontendUrl}/app`);
  await page.waitForURL(onPath('/app/billing'));
  await settle(page);
  await page.getByRole('button', { name: /^Pay with / }).first().click();
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
writeFileSync(out, `${JSON.stringify({ recordedAt: new Date().toISOString(), seed, scanning, entries }, null, 1)}\n`);
console.log(`${entries.length} API exchanges recorded in ${path.relative(process.cwd(), out)}`);
