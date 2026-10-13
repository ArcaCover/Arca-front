// Local-only UI smoke test. Start the production frontend at 127.0.0.1:3001 first.
// API responses here are synthetic contract fixtures; no live services are contacted.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "../../Arca-back/node_modules/playwright/index.mjs";
const frontendUrl = process.env.ARCA_FRONTEND_URL ?? "http://127.0.0.1:3001";
const apiUrl = process.env.ARCA_API_URL ?? "http://localhost:8080";
const artifactDir =
  process.env.ARCA_ARTIFACT_DIR ?? path.resolve("artifacts/assessment");
mkdirSync(artifactDir, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
await page.route("**/*", (route) => {
  const host = new URL(route.request().url()).hostname;
  return ["localhost", "127.0.0.1"].includes(host)
    ? route.continue()
    : route.abort();
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const question = (id, type, overrides = {}) => ({
  id,
  domain: "governance",
  domainLabel: "AI Governance & Policy",
  type,
  text: "Does your firm have written guidance for using AI?",
  help: "A short policy or internal memo counts. Choose what best reflects your practice today.",
  context:
    "Your public website includes an AI policy. Confirm how your team uses it.",
  scored: true,
  evidence: [
    {
      id: "e_policy",
      signal: "website.W1_aiPolicy.found",
      value: true,
      text: "An AI policy was found in the public website scan.",
      sourceUrl: "https://firm.example/ai-policy",
    },
  ],
  options: [
    { id: "yes", label: "Written and shared with the team", exclusive: false },
    {
      id: "partial",
      label: "Written, but not yet shared with everyone",
      exclusive: false,
    },
    { id: "informal", label: "We have informal guidance", exclusive: false },
    { id: "no", label: "No written guidance yet", exclusive: false },
  ],
  scale: null,
  number: null,
  suggestedAnswer: { kind: "option", optionId: "partial" },
  ...overrides,
});
const questions = [
  question("D1.1", "single_select"),
  question("D2.1", "multi_select", {
    domain: "tools",
    domainLabel: "AI Tools & Usage",
    text: "Which types of AI tools does your team use?",
    suggestedAnswer: null,
    context: null,
    evidence: [],
    options: [
      { id: "enterprise", label: "Enterprise AI tools", exclusive: false },
      { id: "consumer", label: "Personal AI accounts", exclusive: false },
      { id: "none", label: "None of these", exclusive: true },
    ],
  }),
  question("D3.1", "scale", {
    domain: "oversight",
    domainLabel: "Human Oversight",
    text: "How much AI-assisted work gets reviewed?",
    options: null,
    scale: {
      min: 0,
      max: 4,
      step: 1,
      minLabel: "None of it",
      maxLabel: "All of it",
    },
    context: null,
    evidence: [],
    suggestedAnswer: null,
  }),
  question("D5.1", "number", {
    domain: "training",
    domainLabel: "Training & Awareness",
    text: "How many people have completed AI training?",
    options: null,
    number: { min: 0, max: 100, unit: "team members" },
    context: null,
    evidence: [],
    suggestedAnswer: null,
  }),
];
const answers = {};
let completed = false;
let saveCount = 0,
  completeCount = 0,
  failSave = true;
const view = () => ({
  assessmentId: "as_ui",
  scanId: "sc_ui",
  status: completed ? "COMPLETED" : "IN_PROGRESS",
  bankVersion: "0.1.0-demo",
  bankStatus: "DEMO",
  planner: "rules",
  intro: "A thoughtful look at the way your firm works with AI.",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  sessionScope: "CURRENT_TAB_24H",
  questions,
  answers,
  skipped: [],
  progress: { answered: Object.keys(answers).length, total: questions.length },
  estimatedMinutes: 4,
});
const result = {
  assessmentId: "as_ui",
  scanId: "sc_ui",
  bankVersion: "0.1.0-demo",
  bankStatus: "DEMO",
  scoringVersion: "demo-v1",
  commercialDecisionBlocked: true,
  layer1Score: 74,
  layer2Score: 68,
  compositeScore: 70,
  tier: "FORTIFIED",
  decision: "REFERRAL",
  domains: [
    "governance",
    "tools",
    "oversight",
    "data_protection",
    "training",
    "incident_preparedness",
  ].map((key, i) => ({
    key,
    label: [
      "AI Governance & Policy",
      "AI Tools & Usage",
      "Human Oversight",
      "Data Protection",
      "Training & Awareness",
      "Incident Preparedness",
    ][i],
    weight: [25, 20, 20, 15, 10, 10][i],
    score: 60 + i * 3,
    status: "KNOWN",
  })),
  flags: ["DEMO_ASSESSMENT"],
  actionPlan: [
    {
      id: "improve-policy",
      domain: "governance",
      title: "Share written guidance with your team",
      detail:
        "Make the policy accessible to everyone who uses AI in client work.",
      pointsGain: 5,
    },
  ],
  completedAt: new Date().toISOString(),
};
await page.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname;
  if (req.method() === "OPTIONS")
    return route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
        "access-control-allow-headers": "authorization,content-type",
      },
    });
  const send = (status, body) =>
    route.fulfill({
      status,
      json: body,
      headers: { "access-control-allow-origin": "*" },
    });
  if (path.endsWith("/complete")) {
    completeCount++;
    completed = true;
    await new Promise((r) => setTimeout(r, 250));
    return send(200, result);
  }
  if (path.endsWith("/result")) return send(200, result);
  if (req.method() === "PUT") {
    saveCount++;
    if (failSave) {
      failSave = false;
      return send(500, {
        error: "internal_error",
        message: "Temporary fixture outage",
      });
    }
    const id = decodeURIComponent(path.split("/").pop());
    answers[id] = req.postDataJSON().answer;
    return send(200, view());
  }
  return send(200, view());
});
await page.addInitScript(() =>
  sessionStorage.setItem("arca.scan.sc_ui", "test-token"),
);
await page.goto(`${frontendUrl}/assessment?scan=sc_ui&a=as_ui`);
await page
  .getByRole("heading", {
    name: "Does your firm have written guidance for using AI?",
  })
  .waitFor();
if (await page.getByRole("radio", { checked: true }).count())
  throw Error("Suggestion was auto-selected");
await page.screenshot({
  path: path.join(artifactDir, "desktop.png"),
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "Use this answer" }).click();
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.getByRole("alert").filter({ hasText: "couldn’t save" }).waitFor();
if (
  !(await page
    .getByRole("radio", { name: "Written, but not yet shared with everyone" })
    .isChecked())
)
  throw Error("Failed save lost draft");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page
  .getByRole("heading", { name: "Which types of AI tools does your team use?" })
  .waitFor();
await page.getByText("Enterprise AI tools", { exact: true }).click();
await page.getByText("None of these", { exact: true }).click();
if (
  await page.getByRole("checkbox", { name: "Enterprise AI tools" }).isChecked()
)
  throw Error("exclusive did not clear");
await page.getByText("Personal AI accounts", { exact: true }).click();
if (await page.getByRole("checkbox", { name: "None of these" }).isChecked())
  throw Error("normal did not clear exclusive");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page
  .getByRole("heading", { name: "How much AI-assisted work gets reviewed?" })
  .waitFor();
if (
  await page.getByRole("button", { name: "Continue", exact: true }).isEnabled()
)
  throw Error("Scale default auto-answered");
await page.getByRole("button", { name: "0: None of it", exact: true }).click();
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.getByRole("spinbutton").fill("1000");
if (
  await page.getByRole("button", { name: "Continue", exact: true }).isEnabled()
)
  throw Error("Number bounds ignored");
await page.getByRole("spinbutton").fill("12");
await page.getByRole("button", { name: "Continue", exact: true }).click();
await page.getByRole("heading", { name: "One last look." }).waitFor();
if (await page.getByRole("button", { name: "See my demo score" }).isEnabled())
  throw Error("No attestation gating");
await page.screenshot({
  path: path.join(artifactDir, "review.png"),
  fullPage: true,
  animations: "disabled",
});
await page.setViewportSize({ width: 390, height: 844 });
await page
  .getByRole("button", {
    name: "Edit answer: Does your firm have written guidance for using AI?",
  })
  .click();
await page.screenshot({
  path: path.join(artifactDir, "mobile.png"),
  fullPage: true,
  animations: "disabled",
});
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw Error("Mobile question overflow");

await page.getByRole("button", { name: "Review", exact: true }).click();
await page.getByRole("heading", { name: "One last look." }).waitFor();
await page.setViewportSize({ width: 1440, height: 1050 });
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: "See my demo score" }).dblclick();
await page.getByRole("heading", { name: "Your governance profile" }).waitFor();
if (completeCount !== 1) throw Error("Duplicate completion " + completeCount);
await page.screenshot({
  path: path.join(artifactDir, "results.png"),
  fullPage: true,
  animations: "disabled",
});
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.getByRole("heading", { name: "Your governance profile" }).waitFor();
if (
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
)
  throw Error("Mobile overflow");
await page.screenshot({
  path: path.join(artifactDir, "results-mobile.png"),
  fullPage: true,
  animations: "disabled",
});
await page.goto(`${frontendUrl}/assessment?scan=sc_ui&a=as_ui`);
await page.getByRole("heading", { name: "Your governance profile" }).waitFor();
if (errors.length) throw Error("Browser errors: " + errors.join("; "));
console.log(
  JSON.stringify({
    saveCount,
    completeCount,
    pageErrors: errors,
    screenshots: 5,
  }),
);
await browser.close();
