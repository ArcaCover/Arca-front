// Browser smoke of the webapp demo (DN-10 §10): real Chromium against the real front and back in mock. One browser,
// with a context each for the owner, the invited member and the ARCA platform admin, walks the five demo points in
// order; each point builds on the one before. Nothing is faked; any request to a host off this machine is refused and
// fails the run.
// Usage: node scripts/webapp-demo-smoke.mjs, with `npm run stack -- mock` running (from Arca-back).
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '../../Arca-back/node_modules/playwright/index.mjs';

const frontendUrl = (process.env.ARCA_FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiUrl = (process.env.ARCA_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const artifactDir = process.env.ARCA_ARTIFACT_DIR ?? path.resolve('artifacts/webapp');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const MOCK_LABEL = 'MOCK · no real APIs · in-memory data';
// next dev compiles each route on its first visit, which can take a while on this machine.
const STEP_MS = 60_000;
const SCAN_MS = 120_000;

const ORG_NAME = 'Robust Law (demo)';
const MEMBER_EMAIL = `member+${Date.now()}@arca.example`;
const ADMIN_EMAIL = 'ops@arca.example';
const MONTHLY = 'Monthly (example price)';
const NEW_PRICE = '399.00';
const FORBIDDEN = 'Your role does not allow this';

mkdirSync(artifactDir, { recursive: true });

async function backMode() {
  try {
    const response = await fetch(`${apiUrl}/__debug/mode`, { signal: AbortSignal.timeout(5000) });
    return { status: response.status, mode: (await response.json().catch(() => null))?.mode };
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

const onPath = pathname => url => url.pathname === pathname;
const apiPath = (response, pattern, method) =>
  response.url().startsWith(apiUrl) && pattern.test(new URL(response.url()).pathname) && response.request().method() === method;

// The DN-09 debug panel, as debug-modes-smoke.mjs drives it.
const panel = page => page.getByRole('region', { name: 'Debug state' });

async function setPanel(page, open) {
  const toggle = page.getByRole('button', { name: 'State', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
  if (open) await panel(page).waitFor();
  else await panel(page).waitFor({ state: 'detached' });
}

async function published(page, check, what, timeout) {
  const cell = panel(page).locator('xpath=.//dt[normalize-space()="Published state"]/following-sibling::dd[1]');
  return until(async () => JSON.parse(await cell.innerText()), check, what, timeout);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });
}

// Whatever any context asks off this machine, or any page throws, is pinned on the point that was running.
const offHost = [];
const pageErrors = [];

async function actor(browser, name, permissions = []) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  if (permissions.length) await context.grantPermissions(permissions, { origin: frontendUrl });
  await context.route('**/*', route => {
    const { hostname } = new URL(route.request().url());
    if (LOCAL_HOSTS.has(hostname)) return route.continue();
    offHost.push(hostname);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(STEP_MS);
  page.on('pageerror', error => pageErrors.push(`${name}: ${error.message}`));
  return { context, page };
}

const gauge = (page, score) => page.getByRole('img', { name: `AI Governance Score: ${score} out of 100` });

// What the points hand each other.
const demo = { ownerEmail: '', score: 0, inviteUrl: '' };

// 1. Funnel → results → call to action → sign-up (mock sign-in) → organization created with the analysis claimed.
async function signUpFromResults({ owner: { page } }) {
  await page.goto(`${frontendUrl}/quote`);
  await page.getByText(MOCK_LABEL, { exact: true }).waitFor();
  await setPanel(page, true);
  // In mock this also empties the back's memory, the webapp's included: the run starts from nothing.
  await panel(page).getByRole('button', { name: 'Reset limits' }).click();
  await panel(page).getByText('Rate limits and in-memory data cleared').waitFor();
  await panel(page).getByRole('button', { name: 'Fill mock firm' }).click();
  await setPanel(page, false);
  demo.ownerEmail = await page.getByLabel('Work email').inputValue();
  if ((await page.getByLabel('Firm website').inputValue()) !== 'robust.arca.example') throw new Error('The mock firm is not robust.arca.example');
  await page.getByRole('button', { name: 'Scan my firm' }).click();
  await page.waitForURL(onPath('/score'), { timeout: SCAN_MS });
  await page.getByRole('button', { name: 'Refine your score' }).click();
  await page.waitForURL(onPath('/assessment'));
  await setPanel(page, true);
  await published(page, state => ['READY', 'IN_PROGRESS'].includes(state.status), 'a planned assessment in the panel');
  // Auto-answer reloads the page once every answer is saved.
  await Promise.all([
    page.waitForEvent('load', { timeout: SCAN_MS }),
    panel(page).getByRole('button', { name: 'Auto-answer' }).click(),
  ]);
  await page.getByRole('heading', { name: 'One last look.' }).waitFor();
  await setPanel(page, true);
  await panel(page).getByRole('button', { name: 'Attest & complete' }).click();
  await page.waitForURL(onPath('/assessment/results'));
  const { compositeScore } = await published(page, state => 'compositeScore' in state, 'the result in the panel');
  demo.score = Math.round(compositeScore);
  await setPanel(page, false);
  await gauge(page, demo.score).waitFor();
  await page.getByRole('button', { name: 'Save your results and activate your account' }).click();
  await page.waitForURL(onPath('/app/signup'));
  const email = page.getByLabel('Email');
  if ((await email.inputValue()) !== demo.ownerEmail || (await email.getAttribute('readonly')) === null) {
    throw new Error('The sign-up email is not the scan email, locked');
  }
  await page.getByLabel('Organization name').fill(ORG_NAME);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await page.waitForURL(onPath('/app/billing'));
  await page.getByText('Pending payment').waitFor();
  await page.getByText(ORG_NAME, { exact: true }).waitFor();
  await shot(page, '1-signed-up');
  console.log(`  "${ORG_NAME}" created for the scan's email; the results scored ${demo.score}`);
}

// 2. /app blocked (402) → /app/billing → simulated payment → /app with the analysis.
async function payToEnter({ owner: { page } }) {
  const blocked = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/analyses$/, 'GET'));
  await page.goto(`${frontendUrl}/app`);
  if ((await blocked).status() !== 402) throw new Error(`The analyses answered ${(await blocked).status()} before paying`);
  await page.waitForURL(onPath('/app/billing'));
  await page.getByRole('button', { name: `Pay with ${MONTHLY}` }).click();
  await page.waitForURL(onPath('/app/billing/mock-checkout'));
  await shot(page, '2-mock-checkout');
  await page.getByRole('button', { name: 'Simulated payment' }).click();
  await page.waitForURL(url => url.pathname === '/app' && url.searchParams.get('paid') === '1');
  await page.getByText('Payment received. Your organization is active.').waitFor();
  await page.getByRole('heading', { name: 'robust.arca.example' }).waitFor();
  await gauge(page, demo.score).waitFor();
  await shot(page, '2-paid');
  console.log(`  402 before paying; after the simulated payment /app shows robust.arca.example at ${demo.score}`);
}

// 3. Invite a member → they join with the link → they cannot pay or change roles: the back answers 403 and it shows.
async function memberIsRefused({ owner, member: { page } }) {
  await owner.page.goto(`${frontendUrl}/app/members`);
  await owner.page.getByLabel('Email to invite').fill(MEMBER_EMAIL);
  await owner.page.getByRole('button', { name: 'Send invitation' }).click();
  await owner.page.getByRole('button', { name: 'Copy invite link' }).click();
  await owner.page.getByText('Invite link copied.').waitFor();
  demo.inviteUrl = await owner.page.evaluate(() => navigator.clipboard.readText());
  const token = new URL(demo.inviteUrl).pathname.split('/').pop();
  if (!token || (await owner.page.locator('body').innerText()).includes(token)) throw new Error('The page shows the whole invite token');
  await shot(owner.page, '3-invited');

  await page.goto(demo.inviteUrl);
  await page.getByLabel('Email').fill(MEMBER_EMAIL);
  await page.getByRole('button', { name: 'Sign in and accept' }).click();
  await page.waitForURL(onPath('/app'));
  await gauge(page, demo.score).waitFor();

  // The organization is already paid, so billing offers the portal, not a checkout (ebfc3cf); both need billing.manage.
  await page.goto(`${frontendUrl}/app/billing`);
  const portal = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/billing\/portal$/, 'POST'));
  await page.getByRole('button', { name: 'Manage billing' }).click();
  if ((await portal).status() !== 403) throw new Error(`The member's billing portal answered ${(await portal).status()}`);
  await page.getByRole('alert').filter({ hasText: FORBIDDEN }).waitFor();
  await shot(page, '3-member-cannot-pay');

  await page.goto(`${frontendUrl}/app/members`);
  const ownerRole = page.getByLabel(`Role for ${demo.ownerEmail}`);
  const setRole = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/members\/[^/]+$/, 'PATCH'));
  await ownerRole.selectOption('member');
  if ((await setRole).status() !== 403) throw new Error(`The member's role change answered ${(await setRole).status()}`);
  await page.getByRole('alert').filter({ hasText: FORBIDDEN }).waitFor();
  if ((await ownerRole.inputValue()) !== 'owner') throw new Error('The owner lost the owner role');
  await shot(page, '3-member-cannot-set-roles');
  console.log('  the member joined by the link and sees the analysis; billing portal 403, role change 403, both shown');
}

// 4. The simulated platform admin changes a plan's price → /app/billing shows it.
async function adminChangesPrice({ owner, admin: { page } }) {
  await page.goto(`${frontendUrl}/app/login`);
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Sign in as an ARCA platform admin (mock)').check();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(onPath('/app/admin'));
  await page.getByRole('heading', { name: 'Platform admin (proof of concept)' }).waitFor();
  const update = page.waitForResponse(response => apiPath(response, /^\/admin\/plans\/monthly$/, 'PUT'));
  await page.getByLabel(`Price of ${MONTHLY} in USD`).fill(NEW_PRICE);
  await page.getByRole('button', { name: `Save the price of ${MONTHLY}` }).click();
  if ((await update).status() !== 200) throw new Error(`PUT /admin/plans/monthly answered ${(await update).status()}`);
  await page.getByText(`${MONTHLY} now costs $${NEW_PRICE} / month.`).waitFor();
  await shot(page, '4-admin-price');

  // The owner's organization is paid, so its billing page offers the portal and lists no plans (ebfc3cf). The plans it
  // would list come from GET /plans, so that is where the new price has to show.
  const plans = await (await fetch(`${apiUrl}/plans`)).json();
  const monthly = plans.find(plan => plan.code === 'monthly');
  if (monthly?.amountCents !== Number(NEW_PRICE) * 100) throw new Error(`GET /plans still prices monthly at ${monthly?.amountCents}`);
  await owner.page.goto(`${frontendUrl}/app/billing`);
  await owner.page.getByRole('button', { name: 'Manage billing' }).waitFor();
  await shot(owner.page, '4-billing-paid');
  console.log(`  ${MONTHLY} set to $${NEW_PRICE} on /app/admin; GET /plans, which billing lists for unpaid organizations, returns it`);
}

// 5. Request deletion → a pending request, nothing deleted; access continues with a notice. ARCA sees it and rejects it.
async function deletionStaysPending({ owner: { page }, admin }) {
  await page.goto(`${frontendUrl}/app/settings`);
  await page.getByLabel('Reason').fill('Closing the firm (demo)');
  await page.getByRole('button', { name: 'Request deletion' }).click();
  // Settings states the pending request next to its closed form (16b299e); the layout leaves its own notice out there.
  await page.getByText(/A deletion request is pending review by ARCA/).waitFor();
  await page.goto(`${frontendUrl}/app`);
  await page.getByText(/A deletion request is pending review by ARCA/).waitFor();
  await gauge(page, demo.score).waitFor();
  await shot(page, '5-pending-access-continues');

  await admin.page.reload();
  await admin.page.getByRole('button', { name: `Approve the deletion of ${ORG_NAME}` }).waitFor();
  await admin.page.getByText('Closing the firm (demo)').waitFor();
  await shot(admin.page, '5-admin-queue');
  await admin.page.getByRole('button', { name: `Reject the deletion of ${ORG_NAME}` }).click();
  await admin.page.getByText('rejected', { exact: true }).waitFor();

  await page.reload();
  await gauge(page, demo.score).waitFor();
  if (await page.getByText(/A deletion request is pending review/).count()) throw new Error('The notice stayed after the rejection');
  console.log('  pending request with access and notice; ARCA saw it and rejected it; the organization was never deleted');
}

const POINTS = [
  ['1 sign-up from the results claims the analysis', signUpFromResults],
  ['2 /app is blocked (402) until the simulated payment', payToEnter],
  ['3 an invited member joins and the back refuses them (403)', memberIsRefused],
  ['4 the platform admin changes a price and billing shows it', adminChangesPrice],
  ['5 a deletion request stays pending while access continues', deletionStaysPending],
];

const back = await backMode();
if (back?.mode !== 'mock') {
  console.error(`The back at ${apiUrl} is not in mock (${back ? `HTTP ${back.status}` : 'no answer'}): start \`npm run stack -- mock\` from Arca-back`);
  process.exit(1);
}

// Playwright's own Chromium, unless PLAYWRIGHT_CHROMIUM_EXECUTABLE names another one.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const browser = await chromium.launch({ executablePath, headless: true });
let passed = 0;
try {
  // The owner copies the invite link like a person would, so their context may use the clipboard.
  const actors = {
    owner: await actor(browser, 'owner', ['clipboard-read', 'clipboard-write']),
    member: await actor(browser, 'member'),
    admin: await actor(browser, 'admin'),
  };
  for (const [name, point] of POINTS) {
    const before = { offHost: offHost.length, pageErrors: pageErrors.length };
    const problems = [];
    try {
      await point(actors);
    } catch (error) {
      problems.push(error.message);
      await Promise.all(Object.entries(actors).map(([who, { page }]) => shot(page, `failed-${name.split(' ')[0]}-${who}`).catch(() => {})));
    }
    // Reported even when the point itself failed: a request off this machine is the first thing to know about.
    const hosts = [...new Set(offHost.slice(before.offHost))];
    if (hosts.length) problems.unshift(`requested hosts off this machine: ${hosts.join(', ')}`);
    const errors = pageErrors.slice(before.pageErrors);
    if (errors.length) problems.push(`browser errors: ${errors.join('; ')}`);
    console.log(problems.length ? `FAIL ${name}: ${problems.join(' | ')}` : `PASS ${name}`);
    if (problems.length) break;
    passed += 1;
  }
} finally {
  await browser.close();
}
console.log(`${passed}/${POINTS.length} demo point(s) passed; screenshots in ${artifactDir}`);
process.exit(passed === POINTS.length ? 0 : 1);
