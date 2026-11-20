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

Cualquier otro valor (`TRUE`, `1`…) para el build. La variable decide qué inicio de sesión corre el build: si front y back no
coinciden, el back rechaza el token (401) y la persona vuelve al login. Desde T19 (abajo) la franja lo detecta y lo dice. La
línea "Simulated in live-debug…" desaparece con cuentas reales, porque ya no es verdad.

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
| `lib/app/enroll-contract.ts` | Reexporta `EnrollRequest`/`EnrollResponse` de los contratos 0.5.0 (abajo) |
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

> **Publicado (2026-11-20):** el front instala `contracts-v0.5.0` desde su tarball. `lib/app/enroll-contract.ts`,
> `lib/app/checkout-contract.ts` y `lib/debug/mode-contract.ts` ya solo reexportan del paquete; lo que sigue describe la etapa
> anterior.

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

## Pre-checkout con Stripe incrustado (DN-13 §19, 2026-11-20)

Diseño aprobado por el usuario: cinco pasos en `/app/signup` y el pago dentro de la página. El back (rama `feat/real-accounts` de
Arca-back) guarda el perfil del despacho (`org_profiles`) y abre Checkout en modo incrustado; detalle en DN-13 §19.

| Paso | Qué pasa |
|---|---|
| 1. You | Email del reclamo bloqueado, nombre, rol (Managing partner / Partner / Office manager / Other) y teléfono opcional |
| 2. Your firm | Razón social, EIN opcional, dirección de facturación de EE. UU., abogados (1 / 2–5 / 6–20 / 21–50 / 50+) y estados donde ejerce (filtro por nombre) |
| 3. Plan | Los planes de `GET /plans` y lo que recibe el despacho |
| 4. Verify email | Reales: `POST /auth/enroll` y el código de 6 dígitos; con el código, `POST /orgs` con el perfil. Simulados: el login simulado y el mismo `POST /orgs` |
| 5. Payment | Reales: Checkout de Stripe incrustado (`@stripe/react-stripe-js` 7.0.1, `@stripe/stripe-js` 10.2.1, versiones exactas de hace más de dos semanas). Simulados: el checkout simulado de siempre, sin cargar Stripe.js |

- **Nada se escribe antes del código.** Los pasos 1–3 viven en el estado de la página y en `sessionStorage` (clave
  `arca.precheckout.<claimId>`), así que una recarga no los pierde y no sobreviven a la pestaña. Se borran al crear la organización.
- **Validación**: las reglas de `OrgProfileInput` del back, copiadas en `lib/app/pre-checkout.ts` (mensajes por campo, foco en el
  primero que falla, `aria-invalid` y `aria-describedby`). Los estados son uno solo, `lib/app/us-states.ts` (50 + DC).
- **Contratos**: `lib/app/checkout-contract.ts` copia `OrgProfileInput`, `EmbeddedCheckoutResponse`, `ORG_CONTACT_ROLES` y
  `ATTORNEY_RANGES` hasta 0.5.0, como `enroll-contract.ts`. El front sigue con el tarball 0.4.0.
- **Stripe.js**: `lib/app/stripe.ts` usa la entrada `@stripe/stripe-js/pure`, que no carga nada al importarse; el script de Stripe
  se pide la primera vez que se abre un pago real. La clave es `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` en Vercel y en
  `.env.local`). Sin ella, el paso 5 dice que el pago no está disponible y que se puede pagar luego desde Billing. El chequeo de
  secretos del build sigue dejando pasar `pk_` y `sb_publishable_` (test nuevo en `scripts/check-no-debug.test.mjs`).
- **`EmbeddedPayment`** pide `POST /orgs/:id/billing/checkout { planCode, uiMode: "embedded" }` y monta
  `EmbeddedCheckoutProvider` con `{ clientSecret }`. Un 409 de organización ya pagada lleva a `/app`; cualquier otro fallo ofrece
  "Try again". Stripe devuelve a `/app/billing/return?session_id=…` al pagar.
- **`/app/billing/return`** (nueva): `POST /orgs/:id/billing/sync`, y si aún no hay acceso, `GET /orgs/:id` cada 2 s hasta 30 s;
  luego "Your payment is being confirmed" con "Check again". Con acceso, `/app?paid=1`.
- **`/app/billing`**: con cuentas reales, "Pay" abre el mismo Checkout incrustado en la página ("Choose another plan" lo cierra).
  Quien abandonó en el paso 5 ya tiene cuenta y organización, entra por `/app`, el paywall lo manda aquí y termina el pago. En los
  modos simulados no cambia (redirección al checkout simulado).

### Pantallas de entrada y código (petición del usuario del 2026-11-20)

- **`FunnelFrame`** (`components/app/FunnelFrame.tsx`): el lenguaje del embudo (orbe, antetítulo, titular grande a la izquierda,
  tarjeta a la derecha; apilado en el móvil). Lo usan el pre-checkout, `/app/login` y `/app/invite/[token]`. Las páginas públicas
  de `/app` usan ahora el lienzo del embudo (`assessment-canvas`) y el logotipo.
- **`IdentityChip`**: el email bloqueado como chip (inicial, email, "From your scan" o "From your invitation").
- **`CodeEntry`**: seis casillas en un grupo con nombre ("Verification code, 6 digits"), avance automático, Backspace hacia atrás,
  flechas, un código pegado o autocompletado en cualquier casilla las llena todas, el sexto dígito verifica solo, un código
  incorrecto conserva los dígitos (la última casilla queda seleccionada), estado "Verified" antes de seguir, reenvío con cuenta
  atrás de 30 s, caducidad de 10 minutos y la pista del spam con el remitente `no-reply@arcacover.com` (el de DN-13 §4.9/F11: con el
  correo por defecto de Supabase el remitente real es otro hasta configurar el SMTP propio). `inputmode="numeric"`,
  `autocomplete="one-time-code"` en la primera casilla, transiciones solo con `motion-safe`.
- **Botones**: "Send my code" en el alta, el login y la invitación (antes "Email me a code" / "Email me a sign-in code"); "Verify"
  en el código (antes "Continue").

### Tarjeta "Keep these results" (petición del usuario del 2026-11-20)

`components/app/SaveResultsCta.tsx`, al final de `/assessment/results`: bloque marino con el nombre del despacho que encontró el
scan (`identity.firmName`, leído con el token de la pestaña; sin nombre, "your firm"), la puntuación, el tier y los pasos del plan de
este resultado, cuatro ventajas que la app cumple hoy (la monitorización no, sus alertas son de muestra), el precio desde `GET /plans`
(`priceTeaser`: el mensual más barato y los meses que ahorra el anual) y "Activate your account" como única acción dorada. La vista
previa del espacio de trabajo (decorativa, `aria-hidden`) solo sale cuando la tarjeta es ancha: el diseño responde al ancho de la
tarjeta (consultas de contenedor), no al de la ventana, porque vive en la columna derecha de los resultados. Copy en
`docs/copy-deck.md` §11 y §12.

### Pruebas

Escritas antes que el código y vistas fallar: `components/app/pre-checkout.test.tsx` (23: cada paso, validación, foco, borrador en la
pestaña, código, `POST /orgs` con el perfil, el traspaso a Stripe con sus componentes simulados, reintento, sin clave, modos
simulados sin Stripe, producción sin webapp, `/app/billing` incrustado y simulado, y `/app/billing/return`),
`lib/app/pre-checkout.test.ts` (6), `components/app/code-entry.test.tsx` (8: grupo y etiquetas, avance, pegar, autocompletar,
Backspace, error que conserva los dígitos, cuenta atrás, modo neutro) y `components/app/save-results-cta.test.tsx` (6: precio desde
la API, posesivo, nombre del despacho, cuentas, ventajas sin promesas de cobertura, singular y sin puntuación). Se adaptaron
`real-accounts`, `app-flow`, `overview-analyses` y `assessment-flow` al flujo nuevo. `npm test`: 55 archivos, 1140 tests;
`typecheck` limpio; `lint` 0 errores y los 6 avisos de siempre; `npm run build` con y sin `NEXT_PUBLIC_WEBAPP_ENABLED=true`:
`0 secret key(s)`, `0 debug leak(s)`. `scripts/webapp-demo-smoke.mjs` recorre ahora el pre-checkout.

Capturas (escritorio y móvil, `mock` y las pantallas reales con la API y Supabase respondidos en el propio script, sin red) en el
scratchpad de la sesión, carpeta `pre-checkout\`.

### Recorrido real en modo test (2026-11-20)

Con la migración aplicada: el front en `live-debug` con cuentas reales (`localhost:3010`), la API real de `live-debug` del back (Supabase
compartido, Stripe test, fuentes de scan simuladas), `stripe listen` y Playwright sin cabeza, en escritorio (1440×1000) y en móvil
(390×844). Ningún correo enviado: la petición del código se respondió en el script y el código salió del admin de Auth. Detalle, ids y
datos creados en DN-13 §19.9 de Arca-back.

- Scan → resultados → "Activate your account" → pasos 1–3 → código en las seis casillas → `POST /orgs` con el perfil → Checkout
  incrustado → 4242 → `/app/billing/return` → `/app?paid=1` con "Payment received. Your organization is active." En la base, la
  organización `active`, su `org_profiles` completo y la suscripción activa.
- Abandono: con el Checkout abierto, ir a `/app` lleva a `/app/billing`; "Pay with Monthly" abre la misma sesión y el pago termina igual.
- Checkout trae el email del cliente relleno y bloqueado, y el cliente de Stripe tiene razón social, teléfono, dirección y el EIN como
  `us_ein`. El primer intento pedía otra vez la dirección entera y ofrecía Link con pago por banco: se arregló en el back (dirección
  `auto` con perfil, Link apagado). Stripe sigue pidiendo el titular y el ZIP de la tarjeta: Checkout no los rellena desde el cliente
  (DN-13 §19.6).
- Capturas en el scratchpad, carpeta `pre-checkout\walk\shots\` (`desktop-step5-embedded-checkout`, `desktop-app-after-payment`,
  `resume-billing-embedded-checkout`, `resume-app-after-payment` y las de cada paso).

## Pendiente

- La tarjeta "Billing contact" de `/app/billing` sigue siendo de muestra y vacía, aunque el perfil del despacho ya existe: debería
  leerlo (falta una ruta que lo devuelva).
- ~~**T19**~~: hecho (abajo). Al publicar 0.5.0, `lib/debug/mode-contract.ts` pasa a reexportar `DebugModeResponse`.
- ~~**T16**~~: hecho con el pre-checkout (arriba): `/app/billing` incrustado y `/app/billing/return`. Falta mostrar `BillingView`
  (fin del periodo, cancelación programada) en `/app/billing`.
- ~~**T18:**~~ hecho: los tres archivos reexportan de 0.5.0 y `package.json` apunta a la release `contracts-v0.5.0`.
- **T30:** `Referrer-Policy` en `/app/*` (el `?claim=` ya se quita de la barra, el token de invitación sigue en la ruta).
- Las cookies del verificador PKCE que deja `signInWithOtp` siguen tras entrar por el código o el enlace (no son sesión).
- `/app/members` todavía no dice "Invitation email sent"; llega con `emailSent` en 0.5.0.

## T19: la franja y el panel leen la webapp del back (DN-13 §20)

Rama `feat/t19-debug-mode`. `/__debug/mode` dice ahora `webapp` (`simulated` | `real`) y `billing` (`simulated` | `test`; nunca
`live`, que el back no arranca en debug). La franja y el panel leen eso, no `NEXT_PUBLIC_WEBAPP_ENABLED`; la variable solo se
compara con lo que dice el back.

| Back | Build | Franja | Fila "Webapp" del panel |
|---|---|---|---|
| `mock` | — | `MOCK · no real APIs · in-memory data` | `Webapp: simulated · billing simulated`, y que vive en la memoria del back |
| `live-debug` simulado | sin la variable | `LIVE DEBUG · real scans · simulated accounts & billing` | igual que `mock` |
| `live-debug` real | `NEXT_PUBLIC_WEBAPP_ENABLED=true` | `LIVE DEBUG · real scans · real accounts · Stripe test` | `Webapp: real · Stripe test`, la tarjeta 4242 con enlace a las tarjetas de test de Stripe, y `stripe listen --forward-to <API>/billing/webhook` con enlace a su documentación |
| Distintos | Distinto del back | `ACCOUNTS MISMATCH · front=real, back=simulated` (o al revés), en marino con el icono de alerta | lo mismo, más una línea en rojo con la variable que hay que cambiar |
| `production` | — | `MODE MISMATCH · … back unreachable or production` (404, como siempre) | "Unknown until the back reports its mode" |

- **Contrato** (antes de publicar 0.5.0; hoy `mode-contract.ts` reexporta del paquete): el `DebugModeResponse` de 0.4.0 es estricto (llamaría "otra forma" a la respuesta nueva).
  `lib/debug/mode-contract.ts` lee los dos campos a mano y el resto con el esquema de 0.4.0, al estilo de `enroll-contract.ts`. Es
  código de debug: solo lo importan `lib/debug` y `components/debug`, y el build de producción no lo lleva.
- **Chequeo de fugas:** marcadores nuevos `ACCOUNTS MISMATCH`, la etiqueta real y `stripe listen --forward-to`
  (`scripts/debug-leaks.mjs`). `npm run build` sin variables y con `NEXT_PUBLIC_WEBAPP_ENABLED=true`: `0 secret key(s)` y
  `0 debug leak(s)`.
- **Pruebas** (escritas antes, vistas fallar): `lib/debug/mode-contract.test.ts` (nuevo), `mode-check`, `ModeBanner`, `StatePanel`,
  `DebugRoot` y `scripts/check-no-debug.test.mjs`. `npm test`: 1156 pasan.
- **Visto en Chromium** a 1280×900 y 390×844 (front en el 3011): con el back en `mock` (8091) y, para los estados reales, con un stub
  local que solo responde `/__debug/mode` (no había claves de Stripe ni de Supabase). La franja mide 24 px en los tres casos, también
  la real en el móvil. Capturas en el scratchpad de la sesión, carpeta `t19\`.
