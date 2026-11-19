# Cuentas reales en el front (DN-13 T9 y la pantalla de T11)

El diseño vive en el back: `../Arca-back/docs/design-notes/DN-13-cuentas-y-cobro-reales.md` (§3.2, §4, §7.6, §8 y lo que el
back ya entrega en §17.8). Esta nota cuenta lo que hace el front, cómo se enciende y cómo se probó. Rama
`feat/real-accounts`, cortada de `feat/unreachable-website-layer2`.

## Qué cuentas usa cada build

Lo decide `realAccounts()` (`lib/app/accounts.ts`) con dos valores que el build deja escritos como literales
(`next.config.ts`): el modo y `NEXT_PUBLIC_WEBAPP_ENABLED`.

| Modo del front | `NEXT_PUBLIC_WEBAPP_ENABLED` | Cuentas | El back tiene que estar en |
|---|---|---|---|
| `production` | sin definir o `false` | ninguna: sin "Keep these results", el login dice que no está disponible | `WEBAPP_ENABLED=false` (501) |
| `production` | `true` | **reales** (Supabase Auth) | `WEBAPP_ENABLED=true` |
| `live-debug` | sin definir o `false` | simuladas, como hasta ahora | `WEBAPP_PROVIDERS=simulated` (por defecto) |
| `live-debug` | `true` | **reales** | `WEBAPP_PROVIDERS=real` |
| `mock` | sin definir o `false` | simuladas, como hasta ahora | `mock` |
| `mock` | `true` | `next dev` y `next build` se paran: mock nunca usa un servicio real (el back también rechaza esa combinación) | — |

Cualquier otro valor (`TRUE`, `1`…) para el build. Hasta que `/__debug/mode` diga qué proveedores usa el back (T19), la
variable es la palabra del front: si front y back no coinciden, el back rechaza el token (401) y la persona vuelve al login.
En `live-debug` con cuentas reales la franja dice `LIVE DEBUG · real scans · real accounts` y la línea "Simulated in
live-debug…" desaparece, porque ya no es verdad.

## Variables

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (en local, la `API_URL` de `supabase status -o env`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable `sb_publishable_…`. Sustituye a `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que ya no se lee |
| `NEXT_PUBLIC_WEBAPP_ENABLED` | `true` solo cuando el back esté encendido. En Vercel, solo en Production y después del back (DN-13 §7.6 paso 4); nunca en Preview (§8.3) |

Ninguna variable de servidor. `npm run build` falla, en cualquier modo, si el bundle o sus mapas llevan una clave secreta de
Supabase (`sb_secret_`), una de Stripe (`sk_live_`, `sk_test_`, `rk_live_`, `rk_test_`) o un secreto de webhook (`whsec_`)
seguidos de material de clave; el prefijo solo no cuenta, porque supabase-js nombra `sb_secret_` para rechazarla en el
navegador. El chequeo imprime el archivo, nunca la clave (`scripts/debug-leaks.mjs`, `findSecretLeaks`).

## Piezas

| Pieza | Qué hace |
|---|---|
| `lib/supabase.ts` | `createBrowserClient` de `@supabase/ssr` 0.12.7 (con supabase-js 2.118.0, su rango de pares). Solo Auth: el navegador nunca lee tablas |
| `lib/app/session.ts` | `currentAppSession()` lee el token antes de cada llamada (Supabase lo refresca solo); `watchSessionEnd()` avisa de un `SIGNED_OUT` que no provocó la pestaña (refresh caducado, otra pestaña); `endRealSession()` cierra con `scope: 'local'` sin despertar a esos avisos. El reclamo y la última organización, como antes |
| `lib/app/auth.ts` | `requestCode` (`signInWithOtp` con `shouldCreateUser: false` y `emailRedirectTo` a `/app/auth/confirm?next=…`), `verifyCode`, `confirmLink` (`verifyOtp` con `token_hash`), `safeNext` (solo rutas `/app/…`), `signOut` y `forgetSession`. `signIn` sigue siendo el simulado |
| `lib/app/client.ts` | Bearer de `currentAppSession()`; `enroll()` (pública) y `deleteAccount()` |
| `lib/app/enroll-contract.ts` | `EnrollRequest`/`EnrollResponse` copiados del back hasta los contratos 0.5.0 (abajo) |
| `components/app/CodeEntry.tsx` | El paso del código: 6 dígitos, "Send a new code", modo neutro para el login |
| `/app/login` | Email → código. Con o sin cuenta, el mismo mensaje: "If an account exists for …, we sent it a 6-digit code" |
| `/app/signup` | Email bloqueado del reclamo → `enroll` una vez → código → nombre → `POST /orgs`. Con el `claim` en la URL (enlace de respaldo, otra pestaña u otro dispositivo) usa ese reclamo y la sesión, y lo quita de la barra |
| `/app/auth/confirm` | **Nueva.** No hace nada al abrirse; "Continue signing in" llama a `verifyOtp({ token_hash })` y va a `next` |
| `/app/invite/[token]` | "Email me a sign-in code" → `enroll` → código → `POST /invitations/:token/accept`. Con la sesión del email invitado, acepta sin código |
| `/app/settings` | Tarjeta "Your account" con "Delete my account" en **todos** los modos (el back también cierra cuentas simuladas, DN-13 §17.4) |
| Shell de `/app` | Guarda asíncrona con `currentAppSession()`; un `SIGNED_OUT` de fuera lleva al login |

Lo simulado no cambia: en `mock`, en `live-debug` por defecto y en `production` sin la variable, cada página pinta su
versión de siempre (`SimulatedLogin`, `SimulatedSignup`, `SimulatedInvite`).

## Contratos: copia local hasta 0.5.0

El front sigue instalando `@arca/contracts` 0.4.0 desde el tarball de la release, sin `file:` y sin tocar esa entrada del
`package-lock.json`. Las dos formas nuevas (`EnrollRequest`, `EnrollResponse`, en `packages/contracts/src/webapp.ts` del back,
sin publicar) viven en `lib/app/enroll-contract.ts` con las mismas reglas: la petición es exactamente `{ claimId }` o
`{ invitationToken }`, y la respuesta es `{ email }` y nada más (un campo de más es un error de contrato). Al publicar 0.5.0
(T18) ese archivo pasa a ser `export { EnrollRequest, EnrollResponse } from "@arca/contracts";` y nada más cambia. Se eligió
esto en vez de un enlace local sin commitear porque así `typecheck`, `test` y `build` pasan con el `package.json` tal cual.
`DELETE /me` no tiene cuerpo, y el código de error nuevo `auth_unavailable` se añadió a `lib/api/client.ts`.

## Pruebas

- `lib/app/real-accounts.test.ts` (sesión, código, enlace, `safeNext`, Bearer, `enroll`, `deleteAccount`, la copia del
  contrato), `components/app/real-accounts.test.tsx` (las cinco pantallas, la guarda del shell, "Delete my account" y el CTA),
  `lib/supabase.test.ts`, y casos nuevos en `lib/arca-mode.test.ts`, `lib/assessment-flow.test.tsx`,
  `lib/debug/bridge.test.ts`, `components/debug/ModeBanner.test.tsx` y `scripts/check-no-debug.test.mjs`. El cliente de
  Supabase de los tests es `lib/test-fixtures/supabase.ts`. Se escribieron antes que el código y fallaron primero.
- `npm test`: 51 archivos, 1096 tests (antes 48 y 965). `typecheck` limpio; `lint` con 0 errores y los 6 avisos de siempre;
  `npm run build` sin `NEXT_PUBLIC_ARCA_MODE`: `0 secret key(s)` y `0 debug leak(s)`. También con
  `NEXT_PUBLIC_WEBAPP_ENABLED=true`: los mismos ceros.

## Recorrido de navegador (2026-11-19)

Contra Supabase local (GoTrue v2.196, ES256, alta pública apagada, plantilla con el código, `otp_expiry` 600) y su Mailpit.
La webapp real del back no arranca sin el proveedor de Stripe (T14), así que la API se levantó con un script de scratch (no
está en ningún repo) que llama al `compose()` del back en `live-debug` con `WEBAPP_PROVIDERS=real`, el repositorio y el
admin de Auth reales de Supabase local, el `MockBillingProvider` en la costura de `billing` y las fuentes mock para los scans
(sin Apify ni OpenAI). El pago se hizo con un sustituto del webhook en ese mismo script (`applyBillingState` del
repositorio), porque T14/T15 no existen. El front corrió con `next dev --webpack` en `live-debug` y
`NEXT_PUBLIC_WEBAPP_ENABLED=true`. Playwright (el del back), sin cabeza, sin ninguna petición fuera de la máquina:

1. Scan mock de `robust.arca.example` → assessment → resultados → "Save your results…" → `POST /auth/enroll` 200 → código de
   Mailpit → `POST /orgs` 201 con un Bearer JWT de Supabase → `/app/billing`.
2. Pago por el sustituto → `/app` con el análisis.
3. Invitación → otro navegador abre el enlace → código → `accept` 200 → miembro en `/app`.
4. El miembro borra su cuenta: `DELETE /me` 204, sin cookies de sesión, a la portada; su token viejo da 401 en `GET /me`; la
   lista de miembros del owner ya no lo tiene.
5. El owner, único owner: 409 y la explicación en el diálogo; sigue dentro.
6. Login nuevo por el enlace de respaldo: la página de confirmación abierta no crea sesión (solo están las cookies del
   verificador PKCE); el botón sí, y lleva a `/app`.
7. Login del email borrado: el mismo mensaje neutro. "Sign out" borra la cookie de sesión.

Ocho de ocho comprobaciones, sin errores de página. Las capturas quedaron en el scratchpad de la sesión, no en el repo.

## Pendiente

- **T19:** que `/__debug/mode` diga `webapp`/`billing` y que el panel y la franja lo lean, en vez de la variable.
- **T16:** con cuentas reales, el checkout simulado de `live-debug` no puede pagar (`/__debug/billing/pay` da 404); el cobro
  real es de T14–T16.
- **T18:** cambiar `lib/app/enroll-contract.ts` por el import de 0.5.0 y la URL de la release.
- **T30:** `Referrer-Policy` en `/app/*` (el `?claim=` ya se quita de la barra, el token de invitación sigue en la ruta).
- Las cookies del verificador PKCE que deja `signInWithOtp` siguen tras entrar por el código o el enlace (no son sesión).
- `/app/members` todavía no dice "Invitation email sent"; llega con `emailSent` en 0.5.0.
