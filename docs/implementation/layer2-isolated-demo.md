# Layer 2 isolated prototype

This checkout is paired with the isolated `Arca-back` checkout next to it. It is a working, API-backed demonstration of DN-07, not a production launch. No carrier rules, final business question bank, pricing, or underwriting approvals are implied.

## Paired checkout

```
arca-isolated/
  Arca-back/
    packages/contracts/
  Arca-front/
```

`@arca/contracts` installs from a release tarball of Arca-back (CLAUDE.md §3), so this checkout builds on its own, Vercel included. To try contracts that are not released yet, run `npm install ../Arca-back/packages/contracts --no-save` after building the backend packages; do not commit a `file:` dependency.

```sh
cd ../Arca-back
npm ci
npm run build
cd ../Arca-front
npm ci
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8080` explicitly in `.env.local`. The frontend refuses to guess an API origin, including in production builds. There is no fallback to the live Arca API.

For a local demonstration, run the backend in mock/rules/memory mode with an explicit local signing secret. Refer to the backend's isolated demo instructions. Then run `npm run dev -- --hostname 127.0.0.1 --port 3001` (or build and start). Allow `http://127.0.0.1:3001` in the local API's CORS origins. Use only fictitious firm/email inputs in the demo.

## Implemented behavior

- `/score` preloads an idempotent assessment request while the user reads their pre-score. “Refine your score” opens that assessment.
- `/assessment?scan=…&a=…` loads from the shared runtime-validated contract. URLs carry only opaque scan/assessment IDs, never answers, email addresses, firm details, or the bearer token.
- The API owns the visible question list, question copy, ordering, branch rules, answer invalidation and scoring. The frontend does not infer business rules or points.
- All five types are supported: single-select, multi-select, yes/no, scale and bounded integer input. Exclusive multi-select options clear the other selections. Suggestions are unselected until the user explicitly chooses them; selecting one still requires Continue.
- Answers are saved when the user presses Continue or Save change. This deliberate confirmation step is keyboard-accessible and avoids surprise focus/navigation changes while using native radio controls. Unsaved selections are not claimed to be saved.
- Every successful write replaces the displayed question list and saved answers with the response. A changed answer can insert or remove follow-ups; invalidated answers are never merged back from local state.
- Planning polls at 1.2-second intervals, with a 45-second wait limit and visible retry. Individual HTTP requests have a 15-second timeout. Loading, network errors, rejected answers, missing session and expired session have recoverable, accessible states.
- Back navigation, review, per-answer editing, explicit attestation and in-flight submit guards are implemented. Completion is also idempotent on the backend.
- The bearer token and ID-only resume convenience live in `sessionStorage`. Access is limited to the current tab and the server's 24-hour scan expiry. Closing the tab loses access. There is no email/magic-link or cross-tab recovery claim.
- `/assessment/results?scan=…&a=…` fetches the saved result. It uses the server's score/tier, six domain scores, and suggested action plan. A missing combined score is shown as absent, not zero. Unfinished results link back to the assessment.
- Demo disclaimers are prominent. Invented firm details, benchmarks, premium projections, pricing cards, nonfunctional bind/broker/PDF buttons and the legacy questionnaire/results mocks were removed from Layer 2.
- The existing marino/cielo/oro tokens, Space Grotesk/Mulish typography, gauge, tier and domain bars are retained. Mobile layout, native form controls, visible keyboard focus and reduced-motion preferences are supported.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover the shared API boundary, answer presentation, exclusivity, unsafe evidence links, visible-list navigation and tab-local expiry. UI interaction tests exercise the rendered controls and interrupted flows. The separate `npm run test:browser:assessment` smoke script exercises actual Chromium against a frontend running at `http://127.0.0.1:3001`, with synthetic API responses intercepted at `http://localhost:8080`. It blocks non-local network requests, covers interruption/retry, all controls, review/attestation, duplicate-submit protection and mobile overflow, and writes screenshots to `artifacts/assessment` (override with `ARCA_ARTIFACT_DIR`). Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if Chromium is not at `/usr/bin/chromium`. It uses the paired backend's installed Playwright. This browser check is separate from unit/component tests and requires a functioning local Chromium environment.

## Intentionally not in scope

- Production deployment or changes to the original repositories
- Live scanning, paid model calls or new external services
- Final business-approved question content, scoring weights/formulas or flag policy
- Real underwriting decisions, insurance offers, prices or comparison benchmarks
- Long-term login, magic links, tab-close recovery or report PDF generation

## Verified in this isolated checkout

- All 154 unit and React interaction tests pass (9 suites).
- TypeScript and the production build pass. The production build bundles the existing Space Grotesk and Mulish font assets.
- ESLint reports no errors. Six `set-state-in-effect` warnings remain: four pre-existing and two API/session-loading effects in the new routes.
- The local Chromium smoke passes on desktop and at 390px mobile width: five answer requests including the deliberate failed-save retry, one completion request after a double click, no browser page errors, and no horizontal overflow. Five screenshots cover the question, review, results and mobile variants. Its API responses are synthetic contract fixtures, not live firm data.
- Production preview verification used explicit `NEXT_PUBLIC_API_URL=http://127.0.0.1:8089` with the local mock backend; the example environment retains the conventional localhost port 8080. To run the smoke on that preview, set `ARCA_FRONTEND_URL=http://127.0.0.1:3002` and `ARCA_API_URL=http://127.0.0.1:8089`.

The memory-backed local demo resets when the API process restarts. This is separate from the production-capable assessment repository in the backend.
