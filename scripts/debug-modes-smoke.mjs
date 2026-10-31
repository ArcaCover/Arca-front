// Browser smoke of the debug modes (DN-09 8.12): real Chromium against the real front and back in mock, driven through
// the debug panel's own buttons. Nothing is faked; any request to a host off this machine is refused and fails the run.
// Usage:
//   node scripts/debug-modes-smoke.mjs            scenarios 1-4, with `npm run stack -- mock` running (from Arca-back)
//   node scripts/debug-modes-smoke.mjs mismatch   scenario 5, with a mock front whose API (ARCA_API_URL) does not answer
// The front's API URL is fixed when Next compiles it, so the smoke cannot point a running front elsewhere: scenario 5
// needs the back stopped (or a front started against a port with nothing on it), hence the separate run.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '../../Arca-back/node_modules/playwright/index.mjs';

const frontendUrl = (process.env.ARCA_FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiUrl = (process.env.ARCA_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const artifactDir = process.env.ARCA_ARTIFACT_DIR ?? path.resolve('artifacts/modes');
const run = process.argv[2] ?? 'flow';
if (!['flow', 'mismatch'].includes(run)) {
  console.error('Usage: node scripts/debug-modes-smoke.mjs [mismatch]');
  process.exit(1);
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// next/font serves the fonts from the front itself; these two are allowed in case a stylesheet still asks Google.
const FONT_HOSTS = new Set(['fonts.gstatic.com', 'fonts.googleapis.com']);
const MOCK_LABEL = 'MOCK · no real APIs · in-memory data';
const STRIP = '[data-arca-debug="arca-debug-sentinel-7f3c"]';
const MISMATCH_LABEL = 'MODE MISMATCH · front=mock, back unreachable or production';
// next dev compiles each route on its first visit, which can take a while on this machine.
const STEP_MS = 60_000;
const SCAN_MS = 120_000;

mkdirSync(artifactDir, { recursive: true });

async function backAnswers() {
  try {
    const response = await fetch(`${apiUrl}/__debug/mode`, { signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => null) };
  } catch {
    return null;
  }
}

async function until(read, check, what, timeout = STEP_MS) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await read().catch(() => undefined);
    if (value !== undefined && check(value)) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

const panel = page => page.getByRole('region', { name: 'Debug state' });

async function setPanel(page, open) {
  const toggle = page.getByRole('button', { name: 'State', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
  if (open) await panel(page).waitFor();
  else await panel(page).waitFor({ state: 'detached' });
}

// What the current page published to the panel, as the panel prints it (JSON, with emails and tokens masked).
async function published(page, check, what, timeout) {
  const cell = panel(page).locator('xpath=.//dt[normalize-space()="Published state"]/following-sibling::dd[1]');
  return until(async () => JSON.parse(await cell.innerText()), check, what, timeout);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });
}

// One context per scenario: the scenario and the scan token live in the tab's sessionStorage, so nothing carries over.
async function withPage(browser, name, body) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  page.setDefaultTimeout(STEP_MS);
  const offHost = [];
  const pageErrors = [];
  const scanStarts = [];
  const failed = [];
  await context.route('**/*', route => {
    const { hostname } = new URL(route.request().url());
    if (LOCAL_HOSTS.has(hostname) || FONT_HOSTS.has(hostname)) return route.continue();
    offHost.push(hostname);
    return route.abort('blockedbyclient');
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('request', request => {
    if (request.method() !== 'POST' || request.url() !== `${apiUrl}/scan`) return;
    scanStarts.push(request.headers()['x-arca-debug-scenario'] ?? null);
  });
  const problems = [];
  try {
    await body(page, { scanStarts, failed });
  } catch (error) {
    problems.push(error.message);
    await shot(page, `failed-${name.split(' ')[0]}`).catch(() => {});
  } finally {
    await context.close();
  }
  // Reported even when the scenario itself failed: a request off this machine is the first thing to know about.
  if (offHost.length) problems.unshift(`requested hosts off this machine: ${[...new Set(offHost)].join(', ')}`);
  if (pageErrors.length) problems.push(`browser errors: ${pageErrors.join('; ')}`);
  console.log(problems.length ? `FAIL ${name}: ${problems.join(' | ')}` : `PASS ${name}`);
  return problems.length === 0;
}

const stripText = async page => (await page.locator(STRIP).innerText()).replace(/\s+/g, ' ').trim();

// /quote with the panel: clears the limits (and, in mock, the memory), picks the preset, fills the mock firm, submits.
// `armed` is what the strip must say the next scan injects once the preset is chosen.
async function startScan(page, preset, armed) {
  await page.goto(`${frontendUrl}/quote`);
  await page.getByText(MOCK_LABEL, { exact: true }).waitFor();
  await setPanel(page, true);
  await panel(page).getByRole('button', { name: 'Reset limits' }).click();
  await panel(page).getByText('Rate limits and in-memory data cleared').waitFor();
  if (preset) await panel(page).getByRole('button', { name: preset, exact: true }).click();
  await panel(page).getByText(preset ? /^Next scan injects: / : /^Next scan: no scenario injected$/).waitFor();
  const expected = armed ? `${MOCK_LABEL} · next scan injects: ${armed}` : MOCK_LABEL;
  await until(() => stripText(page), text => text === expected, `the strip to read "${expected}"`);
  await panel(page).getByRole('button', { name: 'Fill mock firm' }).click();
  // The panel lies over the form; it is closed to reach the button, as a person would.
  await setPanel(page, false);
  await page.getByRole('button', { name: 'Scan my firm' }).click();
}

// One-shot (DN-09 §5.3): once a scan has taken the scenario, the tab holds none and the strip says nothing more.
async function scenarioTaken(page) {
  const stored = await page.evaluate(() => sessionStorage.getItem('arca.debug.scenario'));
  if (stored !== null) throw new Error(`The scenario is still stored after the scan: ${stored}`);
  await until(() => stripText(page), text => text === MOCK_LABEL, 'the strip to drop the armed scenario');
}

function scenarioSent({ scanStarts }, count = 1) {
  if (scanStarts.length !== count) throw new Error(`Expected ${count} POST /scan, saw ${scanStarts.length}`);
  const last = scanStarts[count - 1];
  return last === null ? null : JSON.parse(last);
}

const onPath = pathname => url => url.pathname === pathname;

async function happyPath(page, seen) {
  await startScan(page, null);
  await page.waitForURL(onPath('/score'), { timeout: SCAN_MS });
  if (scenarioSent(seen) !== null) throw new Error('A scenario header travelled without a scenario chosen');
  await page.getByRole('heading', { name: 'Score breakdown' }).waitFor();
  await setPanel(page, true);
  await published(page, state => state.status === 'COMPLETED', 'status COMPLETED in the panel on /score');
  await shot(page, '1-score');
  await setPanel(page, false);
  await page.getByRole('button', { name: 'Refine your score' }).click();
  await page.waitForURL(onPath('/assessment'));
  await setPanel(page, true);
  // Auto-answer reads the questions once: it waits for the planner to have written them.
  await published(page, state => ['READY', 'IN_PROGRESS'].includes(state.status), 'a planned assessment in the panel');
  // Auto-answer reloads the page once every answer is saved.
  await Promise.all([
    page.waitForEvent('load', { timeout: SCAN_MS }),
    panel(page).getByRole('button', { name: 'Auto-answer' }).click(),
  ]);
  await page.getByRole('heading', { name: 'One last look.' }).waitFor();
  await setPanel(page, true);
  const { progress } = await published(page, state => state.progress !== undefined, 'the assessment progress');
  if (progress.answered !== progress.total) throw new Error(`Auto-answer answered ${progress.answered}/${progress.total}`);
  await panel(page).getByRole('button', { name: 'Attest & complete' }).click();
  await page.waitForURL(onPath('/assessment/results'));
  const result = await published(page, state => 'compositeScore' in state, 'the result in the panel');
  const { compositeScore, layer1Score, layer2Score, tier } = result;
  if (typeof compositeScore !== 'number') throw new Error(`compositeScore is ${compositeScore}`);
  // The page's own gauge shows the same score, rounded.
  await page.getByRole('img', { name: `AI Governance Score: ${Math.round(compositeScore)} out of 100` }).waitFor();
  await shot(page, '1-results-panel');
  await setPanel(page, false);
  await shot(page, '1-results');
  console.log(`  compositeScore ${compositeScore} (layer 1 ${layer1Score}, layer 2 ${layer2Score}), tier ${tier}`);
}

async function apifyOutOfCredit(page, seen) {
  await startScan(page, 'Apify out of credit', 'Bar apify_quota, Avvo apify_quota');
  await page.waitForURL(onPath('/score'), { timeout: SCAN_MS });
  const sent = scenarioSent(seen);
  if (sent?.bar !== 'apify_quota' || sent.avvo !== 'apify_quota') throw new Error(`Scenario sent: ${JSON.stringify(sent)}`);
  await scenarioTaken(page);
  // /quote published the scenario it actually sent, next to the start's answer.
  const quote = await page.evaluate(() => window.__arcaDebug?.getSnapshot().quote);
  if (quote?.sentScenario?.bar !== 'apify_quota' || quote.sentScenario.avvo !== 'apify_quota' || quote.scanId === undefined) {
    throw new Error(`/quote published ${JSON.stringify(quote)}`);
  }
  await page.getByText('One or more sources did not answer').waitFor();
  await shot(page, '2-apify-out-of-credit');
  await setPanel(page, true);
  const state = await published(page, value => value.sources !== undefined, 'the sources in the panel on /score');
  const { bar } = state.sources;
  if (!bar.reason?.includes('Apify usage limit reached')) throw new Error(`bar.reason is ${bar.reason}`);
  await shot(page, '2-apify-out-of-credit-panel');
  console.log(`  status ${state.status}; bar ${bar.status}/${bar.code}: ${bar.reason}`);
  // The next scan from the same tab, with nothing chosen again, is a clean one: no header at all.
  await setPanel(page, false);
  await page.goto(`${frontendUrl}/quote`);
  await page.getByText(MOCK_LABEL, { exact: true }).waitFor();
  await setPanel(page, true);
  await panel(page).getByText(/^Next scan: no scenario injected$/).waitFor();
  await panel(page).getByRole('button', { name: 'Fill mock firm' }).click();
  await setPanel(page, false);
  await page.getByRole('button', { name: 'Scan my firm' }).click();
  await page.waitForURL(onPath('/score'), { timeout: SCAN_MS });
  if (scenarioSent(seen, 2) !== null) throw new Error('The scenario travelled with a second scan');
  console.log('  one-shot: the second POST /scan carried no scenario header');
}

async function everySourceDown(page, seen) {
  await startScan(page, 'Every source down', 'Website error, Bar error, Avvo error');
  await page.getByRole('heading', { name: 'We couldn\'t finish your scan' }).waitFor({ timeout: SCAN_MS });
  const sent = scenarioSent(seen);
  const down = ['website', 'bar', 'avvo'].every(source => sent?.[source] === 'error');
  if (!down) throw new Error(`Scenario sent: ${JSON.stringify(sent)}`);
  if (new URL(page.url()).pathname !== '/quote/scanning') throw new Error(`Ended on ${page.url()}`);
  await shot(page, '3-every-source-down');
}

async function sessionExpired(page, seen) {
  const visited = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()));
  });
  await startScan(page, 'Session expired', 'Polls unauthorized');
  const scanning = await until(async () => visited.find(onPath('/quote/scanning')), Boolean, '/quote/scanning', SCAN_MS);
  await page.waitForURL(url => url.pathname === '/quote' && !url.search, { timeout: SCAN_MS });
  if (scenarioSent(seen)?.http?.poll !== 'unauthorized') throw new Error('The poll fault did not travel with the scan');
  await page.getByRole('heading', { name: 'Let\'s scan your firm.' }).waitFor();
  // Back on /quote, the expired-session fault is spent: the next scan would be a normal one.
  await scenarioTaken(page);
  // The scanning page forgets the token of a session the API refused.
  const token = await page.evaluate(id => sessionStorage.getItem(`arca.scan.${id}`), scanning.searchParams.get('scan'));
  if (token !== null) throw new Error('The refused token is still stored');
  await shot(page, '4-session-expired');
}

async function mismatch(page, { failed }) {
  await page.goto(`${frontendUrl}/quote`);
  await page.getByText(MISMATCH_LABEL, { exact: true }).waitFor();
  if (!failed.includes(`${apiUrl}/__debug/mode`)) throw new Error(`The front did not probe ${apiUrl}/__debug/mode`);
  await shot(page, '5-mismatch');
}

const back = await backAnswers();
if (run === 'flow' && back?.body?.mode !== 'mock') {
  const answer = back ? `HTTP ${back.status}` : 'no answer';
  console.error(`The back at ${apiUrl} is not in mock (${answer}): start \`npm run stack -- mock\` from Arca-back`);
  process.exit(1);
}
if (run === 'mismatch' && back !== null) {
  console.error(`Something answers at ${apiUrl} (HTTP ${back.status}): scenario 5 needs the back stopped`);
  process.exit(1);
}

// Playwright's own Chromium, unless PLAYWRIGHT_CHROMIUM_EXECUTABLE names another one.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
try {
  if (run === 'flow') {
    results.push(await withPage(browser, '1 happy path in mock', happyPath));
    results.push(await withPage(browser, '2 preset "Apify out of credit"', apifyOutOfCredit));
    results.push(await withPage(browser, '3 preset "Every source down"', everySourceDown));
    results.push(await withPage(browser, '4 preset "Session expired"', sessionExpired));
  } else {
    results.push(await withPage(browser, '5 mode mismatch', mismatch));
  }
} finally {
  await browser.close();
}
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} scenario(s) passed; screenshots in ${artifactDir}`);
process.exit(passed === results.length ? 0 : 1);
