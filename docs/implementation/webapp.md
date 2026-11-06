# Private webapp (accounts, organizations, roles and billing)

The design, the demo script and the verification record live in the backend repository: `../Arca-back/docs/design-notes/DN-10-webapp-organizaciones-y-cobro.md` (written in Spanish). Section 10 sets the demo scope, section 11 covers how to run the demo and section 12 records what was verified. It builds on the debug modes of DN-09 (`arca-modes.md`).

Today the webapp runs in `mock` only: the sign-in and the payment are simulated, nothing calls Stripe or Supabase Auth, and outside mock its API answers `501 not_configured`.

| Route | What it is |
|---|---|
| `/app/signup` | Reached from "Save your results and activate your account" on `/assessment/results`; creates the organization with the analysis |
| `/app/login` | Sign-in; in mock it also offers "Sign in as an ARCA platform admin (mock)" |
| `/app`, `/app/billing`, `/app/members`, `/app/settings` | The organization's panel, payment, people and deletion request |
| `/app/invite/[token]` | Accepting an invitation |
| `/app/admin` | Platform admin proof of concept: plan prices and the deletion queue |

The code lives in `app/app/`, `components/app/` and `lib/app/`. The simulated sign-in and payment go through `lib/debug/bridge.ts`, so a production build ships none of it.

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
