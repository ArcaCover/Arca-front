// Browser smoke of the role views (DN-11 §7.3): real Chromium against the real front and back in mock. The debug panel
// seeds the demo organization and signs each user in, as a person giving the demo would; a context per user keeps each
// one's session and tab storage apart. The points run in order and each builds on the one before. Nothing is faked; any
// request to a host off this machine is refused and fails the run.
// Usage: node scripts/role-views-smoke.mjs, with `npm run stack -- mock` running (from Arca-back).
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '../../Arca-back/node_modules/playwright/index.mjs';

const frontendUrl = (process.env.ARCA_FRONTEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiUrl = (process.env.ARCA_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const artifactDir = process.env.ARCA_ARTIFACT_DIR ?? path.resolve('artifacts/roles');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const MOCK_LABEL = 'MOCK · no real APIs · in-memory data';
// next dev compiles each route on its first visit, which can take a while on this machine.
const STEP_MS = 60_000;
// The back runs a scan and an assessment before it answers, and gives up after 60 seconds.
const SEED_MS = 90_000;

const ORG_NAME = 'Robust Law (demo)';
const MEMBER_EMAIL = 'member@demo.arca.example';
const FORBIDDEN = 'Your role does not allow this';
const ROLES = ['owner', 'admin', 'member', 'viewer'];
const TEAM = new Set(['owner', 'admin']);
const SIDEBAR = {
  team: ['Overview', 'Analyses', 'Action plan', 'Monitoring', 'Coverage', 'Documents', 'Members', 'Billing', 'Settings', 'Activity', 'Help & support'],
  // Billing still opens for them from the plan status (D10); the activity does not open at all.
  rest: ['Overview', 'Analyses', 'Action plan', 'Monitoring', 'Coverage', 'Documents', 'Members', 'Settings', 'Help & support'],
};

mkdirSync(artifactDir, { recursive: true });

async function backMode() {
  try {
    const response = await fetch(`${apiUrl}/__debug/mode`, { signal: AbortSignal.timeout(5000) });
    return { status: response.status, mode: (await response.json().catch(() => null))?.mode };
  } catch {
    return null;
  }
}

const onPath = pathname => url => url.pathname === pathname;
const apiPath = (response, pattern, method) =>
  response.url().startsWith(apiUrl) && pattern.test(new URL(response.url()).pathname) && response.request().method() === method;
const expectStatus = async (response, status, what) => {
  const actual = (await response).status();
  if (actual !== status) throw new Error(`${what} answered ${actual}, not ${status}`);
};

// The DN-09 debug panel, as the other smokes drive it.
const panel = page => page.getByRole('region', { name: 'Debug state' });

async function setPanel(page, open) {
  const toggle = page.getByRole('button', { name: 'State', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
  if (open) await panel(page).waitFor();
  else await panel(page).waitFor({ state: 'detached' });
}

async function setSwitch(page, on) {
  await setPanel(page, true);
  const toggle = panel(page).getByRole('switch', { name: 'Show forbidden actions' });
  if (on) await toggle.check();
  else await toggle.uncheck();
  await setPanel(page, false);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled' });
}

// Whatever any context asks off this machine, or any page throws, is pinned on the point that was running.
const offHost = [];
const pageErrors = [];

async function actor(browser, name) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
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

/** The sidebar's item labels, without the counters next to them. */
const sidebar = page =>
  page.getByRole('navigation', { name: 'App' }).evaluate(nav =>
    [...nav.querySelectorAll('a')].map(link => link.querySelector('span.flex-1')?.textContent ?? link.textContent),
  );
const present = async locator => (await locator.count()) > 0;

/** The action plan, once the API's plan is on the page. */
async function openPlan(page) {
  const plan = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/actions$/, 'GET'));
  await page.goto(`${frontendUrl}/app/action-plan`);
  await expectStatus(plan, 200, 'GET /orgs/:id/actions');
  await page.getByRole('heading', { name: 'Action plan', level: 1 }).waitFor();
  await page.getByText(/actions done$/).waitFor();
}
const section = (page, name) => page.getByRole('list', { name });
const titlesIn = (page, name) => section(page, name).getByRole('heading', { level: 3 }).allInnerTexts();
const statusOf = (page, title) => page.getByRole('combobox', { name: `Status for “${title}”` });

// What the points hand each other.
const demo = { orgId: '', marked: '', refused: '' };

// 1. The panel seeds the demo organization through the real flow: one paid organization with a user of each role.
async function seed({ owner: { page } }) {
  await page.goto(`${frontendUrl}/quote`);
  await page.getByText(MOCK_LABEL, { exact: true }).waitFor();
  await setPanel(page, true);
  // In mock this also empties the back's memory, the webapp's included: the seed builds a fresh organization.
  await panel(page).getByRole('button', { name: 'Reset limits' }).click();
  await panel(page).getByText('Rate limits and in-memory data cleared').waitFor();
  await page.goto(`${frontendUrl}/app/login`);
  await setPanel(page, true);
  const seeded = page.waitForResponse(response => apiPath(response, /^\/__debug\/seed$/, 'POST'), { timeout: SEED_MS });
  await panel(page).getByRole('button', { name: 'Seed demo organization' }).click();
  const response = await seeded;
  if (response.status() !== 200) throw new Error(`POST /__debug/seed answered ${response.status()}`);
  const body = await response.json();
  demo.orgId = body.organization.id;
  const roles = body.users.map(user => user.role).sort().join(',');
  if (roles !== 'admin,member,owner,platform_admin,viewer') throw new Error(`The seed returned the roles ${roles}`);
  await panel(page)
    .getByText(`${ORG_NAME} is ready, with: owner, admin, member, viewer, ARCA admin`)
    .waitFor({ timeout: SEED_MS });
  // The buttons name the role; a seeded user's email is never on screen.
  if ((await page.locator('body').innerText()).includes('demo.arca.example')) throw new Error('The panel shows a seeded email');
  await shot(page, '1-seeded');
  await setPanel(page, false);
  console.log(`  "${ORG_NAME}" seeded with an owner, an admin, a member, a viewer and an ARCA admin`);
}

async function signInAs(page, who, home) {
  await page.goto(`${frontendUrl}/app/login`);
  await setPanel(page, true);
  await panel(page).getByRole('button', { name: `Sign in as ${who}`, exact: true }).click();
  await page.waitForURL(onPath(home));
}

// 2. Each role signs in from the panel, and gets its own sidebar and controls (DN-11 §6.2).
async function rolesSeeTheirOwn(actors) {
  for (const role of ROLES) {
    const { page } = actors[role];
    const team = TEAM.has(role);
    await signInAs(page, role, '/app');
    await page.getByText(ORG_NAME, { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Your AI risk at a glance' }).waitFor();
    const items = await sidebar(page);
    const expected = team ? SIDEBAR.team : SIDEBAR.rest;
    if (items.join('|') !== expected.join('|')) throw new Error(`${role}'s sidebar is ${items.join(', ')}`);
    if ((await present(page.getByRole('link', { name: 'New analysis', exact: true }))) !== team) {
      throw new Error(`${role} ${team ? 'lacks' : 'gets'} the top bar's New analysis`);
    }
    await shot(page, `2-${role}-overview`);

    await openPlan(page);
    const controls = {
      add: await present(page.getByRole('button', { name: 'Add an action' })),
      assign: await present(page.getByRole('combobox', { name: /^Assignee for / })),
      status: await present(page.getByRole('combobox', { name: /^Status for / })),
    };
    const want = { add: team, assign: team, status: role !== 'viewer' };
    if (JSON.stringify(controls) !== JSON.stringify(want)) {
      throw new Error(`${role}'s action plan controls are ${JSON.stringify(controls)}, not ${JSON.stringify(want)}`);
    }
    if (role === 'viewer') await page.getByText('Your role can read the plan. Ask an owner, admin or member to update an action.').waitFor();
    await shot(page, `2-${role}-action-plan`);

    await page.goto(`${frontendUrl}/app/members`);
    // The sidebar's foot names the signed-in user too, so the page's own list is read inside main.
    await page.getByRole('main').getByText(MEMBER_EMAIL, { exact: true }).waitFor();
    if ((await present(page.getByRole('button', { name: 'Send invitation' }))) !== team) {
      throw new Error(`${role} ${team ? 'cannot' : 'can'} invite`);
    }
    if (!team) await page.getByText('Ask an owner or admin to invite people or change roles.').waitFor();

    await page.goto(`${frontendUrl}/app/activity`);
    // The gate keeps the page's title as its h1, so the page's own description is what shows it opened.
    if (team) await page.getByText('Who did what in your organization').waitFor();
    else await page.getByRole('heading', { name: "Your role can't open this page" }).waitFor();
  }
  console.log('  owner and admin: every item and control; member: no billing, activity, invite or assignment; viewer: read only');
}

// 3. The member marks an action done; the owner, in another browser context, reads it from the back.
async function memberMarks({ member: { page }, owner }) {
  await openPlan(page);
  const [title] = await titlesIn(page, 'Actions to do');
  if (!title) throw new Error('The seeded plan has nothing to do');
  demo.marked = title;
  const patch = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/actions\/[^/]+$/, 'PATCH'));
  await statusOf(page, title).selectOption('done');
  await expectStatus(patch, 200, "The member's PATCH of the action");
  await section(page, 'Actions done').getByRole('heading', { name: title, exact: true }).waitFor();
  await shot(page, '3-member-marked');

  await openPlan(owner.page);
  await section(owner.page, 'Actions done').getByRole('heading', { name: title, exact: true }).waitFor();
  await shot(owner.page, '3-owner-sees-it');
  console.log(`  the member marked "${title}" done; the owner's plan shows it done`);
}

// 4. The viewer cannot mark an action. With the debug switch on it gets the control, and the back answers 403.
async function viewerIsRefused({ viewer: { page } }) {
  await openPlan(page);
  if (await present(page.getByRole('combobox', { name: /^Status for / }))) throw new Error('The viewer has a status control');

  await setSwitch(page, true);
  const [title] = await titlesIn(page, 'Actions to do');
  if (!title) throw new Error('Nothing left to do for the viewer to try');
  demo.refused = title;
  const patch = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/actions\/[^/]+$/, 'PATCH'));
  await statusOf(page, title).selectOption('in_progress');
  await expectStatus(patch, 403, "The viewer's PATCH of the action");
  await page.getByRole('alert').filter({ hasText: FORBIDDEN }).waitFor();
  await section(page, 'Actions to do').getByRole('heading', { name: title, exact: true }).waitFor();
  await shot(page, '4-viewer-refused');
  // The switch lives in this tab's storage; it goes off again so the rest of the run sees the viewer as it is.
  await setSwitch(page, false);
  await page.getByText('Your role can read the plan. Ask an owner, admin or member to update an action.').waitFor();
  console.log(`  no status control for the viewer; with the switch on, its change of "${title}" got the back's 403, shown`);
}

// 5. The admin reads the organization's activity, the member's change included.
async function adminReadsActivity({ admin: { page } }) {
  const activity = page.waitForResponse(response => apiPath(response, /^\/orgs\/[^/]+\/activity$/, 'GET'));
  await page.goto(`${frontendUrl}/app/activity`);
  await expectStatus(activity, 200, 'GET /orgs/:id/activity');
  const row = page.getByRole('listitem').filter({ hasText: `updated the action ${demo.marked}` });
  await row.filter({ hasText: MEMBER_EMAIL }).filter({ hasText: 'Status: To do → Done' }).waitFor();
  await shot(page, '5-admin-activity');
  console.log(`  the admin's activity shows ${MEMBER_EMAIL} moving "${demo.marked}" from To do to Done`);
}

// 6. ARCA's admin opens the organization, its audit and the metrics.
async function arcaSeesIt({ arca: { page } }) {
  await signInAs(page, 'ARCA admin', '/app/admin');
  await page.getByRole('heading', { name: 'Platform admin (proof of concept)' }).waitFor();

  await page.getByRole('tab', { name: 'Organizations' }).click();
  const detail = page.waitForResponse(response => apiPath(response, /^\/admin\/organizations\/[^/]+$/, 'GET'));
  await page.getByRole('button', { name: `Open ${ORG_NAME}` }).click();
  await expectStatus(detail, 200, 'GET /admin/organizations/:id');
  const org = page.getByRole('region', { name: ORG_NAME });
  await org.getByText('robust.arca.example').waitFor();
  const members = org.getByRole('list', { name: 'Members' }).getByRole('listitem');
  if ((await members.count()) !== ROLES.length) throw new Error(`The organization lists ${await members.count()} members`);
  for (const role of ROLES) {
    const label = role[0].toUpperCase() + role.slice(1);
    await members.filter({ hasText: `${role}@demo.arca.example` }).getByText(label, { exact: true }).waitFor();
  }
  await shot(page, '6-arca-organization');

  const audit = page.waitForResponse(
    response => apiPath(response, /^\/admin\/audit$/, 'GET') && new URL(response.url()).searchParams.get('orgId') === demo.orgId,
  );
  await page.getByRole('button', { name: 'See its audit' }).click();
  await expectStatus(audit, 200, 'GET /admin/audit?orgId=');
  await page.getByRole('list', { name: 'Audit events' }).getByRole('listitem')
    .filter({ hasText: `updated the action ${demo.marked}` }).filter({ hasText: MEMBER_EMAIL }).waitFor();
  await shot(page, '6-arca-audit');

  const metrics = page.waitForResponse(response => apiPath(response, /^\/admin\/metrics$/, 'GET'));
  await page.getByRole('tab', { name: 'Metrics' }).click();
  await expectStatus(metrics, 200, 'GET /admin/metrics');
  const counts = await (await metrics).json();
  if (counts.actions.done < 1 || counts.organizations.active < 1) throw new Error(`The metrics count ${JSON.stringify(counts)}`);
  const done = page.getByRole('region', { name: 'Actions' }).locator('xpath=.//dt[normalize-space()="Done"]/following-sibling::dd[1]');
  if (Number(await done.innerText()) !== counts.actions.done) throw new Error('The page shows another Done count than the API');
  await shot(page, '6-arca-metrics');
  console.log(`  ARCA opened the organization (4 members), its audit (the member's change) and the metrics (${counts.actions.done} done)`);
}

const POINTS = [
  ['1 the debug panel seeds the demo organization', seed],
  ['2 each role signs in and gets its own sidebar and controls', rolesSeeTheirOwn],
  ['3 the member marks an action and the owner sees it', memberMarks],
  ['4 the viewer cannot; with the switch on, the back answers 403', viewerIsRefused],
  ['5 the admin sees the activity', adminReadsActivity],
  ['6 ARCA sees the organization, its audit and its metrics', arcaSeesIt],
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
  const actors = {};
  for (const name of [...ROLES, 'arca']) actors[name] = await actor(browser, name);
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
const allPassed = passed === POINTS.length;
console.log(`${passed}/${POINTS.length} point(s) passed${allPassed ? '; no request left this machine' : ''}; screenshots in ${artifactDir}`);
process.exit(allPassed ? 0 : 1);
