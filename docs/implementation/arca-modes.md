# Debug modes: mock and live-debug

The design, the security rules and the verification record live in the backend repository: `../Arca-back/docs/design-notes/DN-09-modos-mock-y-live-debug.md` (written in Spanish). Section 11 covers how to run it and section 12 records what was verified. This page only lists the commands.

| Mode | `NEXT_PUBLIC_ARCA_MODE` (front) / `ARCA_MODE` (back) | What it uses | Banner |
|---|---|---|---|
| production | unset or `production` | whatever `.env.local` configures | none |
| live-debug | `live-debug` | real APIs and the Supabase shared with production | `LIVE DEBUG · real APIs & real database` |
| mock | `mock` | fixtures and in-memory storage, no external API | `MOCK · no real APIs · in-memory data` |

An unknown value stops `next dev` and `next build`. A Vercel build (`VERCEL` set) fails in any mode except production. The debug code is only loaded when the mode is not production, and `npm run build` fails if a production build ships any of it (`scripts/check-no-debug.mjs`).

## Run (Windows PowerShell)

Build the backend once first, because the frontend imports its compiled `@arca/contracts`:

```powershell
cd ..\Arca-back; npm run build
```

Back and front together in one mode, from Arca-back:

```powershell
npm run stack -- mock          # or: live-debug, production
```

Or each repository in its own terminal, with the same script in both:

```powershell
npm run dev:mock               # or: npm run dev:live-debug
```

The scripts set the mode only inside the process they start, so `.env.local` is never edited. For a separate front, also set `$env:NEXT_PUBLIC_API_URL = 'http://localhost:8080'` if `.env.local` points elsewhere.

## Check that both run the same mode

- Look at the banner. `MODE MISMATCH · front=…, back=…` or `… back unreachable or production` means they differ.
- Ask the back directly: `Invoke-RestMethod http://127.0.0.1:8080/__debug/mode`, or `curl.exe -s http://127.0.0.1:8080/__debug/mode`. A production back answers 404.
- `State` on the banner opens the panel, with the per-page state and the scenario and assessment shortcuts.

## Browser smoke

With `npm run stack -- mock` running:

```powershell
npm run test:browser:modes             # scenarios 1-4, screenshots in artifacts/modes
```

Each scenario presses "Reset limits", which in mock also empties the back's in-memory data, so scans made by hand in that session are gone afterwards.

Scenario 5 (mismatch) needs the back stopped, because the front fixes its API URL when it compiles. Stop the stack, then run the front alone with `$env:NEXT_PUBLIC_API_URL = 'http://localhost:8080'; npm run dev:mock`, and in another terminal:

```powershell
npm run test:browser:modes -- mismatch
```

## Back to local production

Stop the debug processes. Then run `npm run stack -- production` from Arca-back, or `npm run dev -- --webpack` here with `npm run dev` in Arca-back. No banner appears, and `/__debug/mode` answers 404.
