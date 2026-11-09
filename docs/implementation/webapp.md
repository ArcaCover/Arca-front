# Private webapp (accounts, organizations, roles and billing)

The design, the demo script and the verification record live in the backend repository: `../Arca-back/docs/design-notes/DN-10-webapp-organizaciones-y-cobro.md` (written in Spanish). Section 10 sets the demo scope, section 11 covers how to run the demo and section 12 records what was verified. It builds on the debug modes of DN-09 (`arca-modes.md`).

Today the webapp runs in the two debug modes only. The sign-in and the payment are simulated, and nothing calls Stripe or Supabase Auth. In production its API answers `501 not_configured`, the results page offers no "Keep these results", and the sign-in says it is not available yet.

| Mode | Webapp | Scans and assessments it reads |
|---|---|---|
| `mock` | in the back's memory, with the simulated sign-in and payment, the demo seed and the sign-ins as a role | in memory, from mock sources |
| `live-debug` | in the back's memory, with the simulated sign-in and payment; no demo seed (the back answers 404) and no sign-in as a role or as a platform admin | real: the real APIs and the Supabase shared with production |
| `production` | none: `501 not_configured` | real |

In live-debug an organization, its members and its payment live only in the API process. They are gone when the API restarts (`tsx watch` restarts it on every source edit), and the same scan can then be saved again. Saving a scan writes nothing to Supabase: the webapp only reads the scan and its assessment. A browser that still holds the simulated session after a restart sees "Complete an analysis to create your organization".

Because the scan behind the screen is real there and the account is not, live-debug says so where someone signs up, signs in or pays. One line, the same on each screen:

> Simulated in live-debug: this account and its payment are held in memory for this debug session and reset when the API restarts.

It shows under the "Keep these results" button on `/assessment/results`, on `/app/login`, `/app/signup`, `/app/invite/[token]`, `/app/billing` and the simulated checkout. Mock does not show it (its strip already says nothing is real) and production has nothing to say it about. The text lives in `lib/debug/bridge.ts` behind the literal mode guard and is rendered by `components/app/SimulationNotice.tsx`; it is one of the strings `scripts/debug-leaks.mjs` looks for in a production build.

| Route | What it is |
|---|---|
| `/app/signup` | Reached from "Save your results and activate your account" on `/assessment/results`, or from "Save your results to a new organization" for someone already signed in to an organization. Its title says "to a new organization" when the signed-in email is the claim's, and "activate your account" otherwise, since the sign-up then signs in as the claim's email. Creates the organization with the analysis |
| `/app/login` | Sign-in; in mock, and only there, it also offers "Sign in as an ARCA platform admin (mock)" |
| `/app`, `/app/billing`, `/app/members`, `/app/settings` | The organization's panel, payment, people and deletion request |
| `/app/billing/mock-checkout` | Stands in for Stripe's checkout in mock and live-debug; a 404 in production |
| `/app/invite/[token]` | Accepting an invitation |
| `/app/admin` | Platform admin proof of concept: plan prices and the deletion queue |

The code lives in `app/app/`, `components/app/` and `lib/app/`. The simulated sign-in and payment go through `lib/debug/bridge.ts`, so a production build ships none of it. Every gate compares `process.env.NEXT_PUBLIC_ARCA_MODE` with a literal (`=== "mock" || === "live-debug"`), which is what lets the production build drop the code behind it.

## Try it in live-debug

With `npm run stack -- live-debug` running from Arca-back (real providers: a new scan costs money, and its result is written to the shared database), run a scan and the assessment, then press "Save your results and activate your account" on `/assessment/results`. Sign-up, the plan, the simulated checkout and `/app` follow as in mock. The debug panel's "Webapp demo" block (seed, sign-ins as a role, "Show forbidden actions") stays out of live-debug. A scan with an injected fault lives in memory only and cannot be saved: the back answers 409.

## Run the demo (Windows PowerShell)

From Arca-back, after `npm run build` there:

```powershell
npm run stack -- mock
```

Then open `http://localhost:3000/quote`. Section 11 of DN-10 has the step-by-step script.

## Browser smoke

With `npm run stack -- mock` running:

```powershell
npm run test:browser:webapp            # the five demo points of DN-10 §10, screenshots in artifacts/webapp
```

It presses "Reset limits" first, which in mock empties the back's in-memory data, the webapp's included.
