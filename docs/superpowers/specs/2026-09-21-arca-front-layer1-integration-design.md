# Integración de Arca-front con la Capa 1 de Arca-back

- **Fecha:** 2026-09-21
- **Estado:** diseño aprobado, pendiente de plan de implementación
- **Repos:** `ArcaCover/Arca-front` (fases 1-5) y `ArcaCover/Arca-back` (fase 0)
- **Alcance:** solo Capa 1. `/quote`, `/quote/scanning` y `/score` dejan de usar mock y
  consumen la API real. `/assessment` y `/assessment/results` conservan su mock, su
  disclaimer y su fuente de datos; solo reciben la actualización mecánica de las firmas
  de `ScoreGauge` y `TierBadge`, que comparten con `/score` (ver 5.7).

## 1. Por qué este documento

`Arca-front` no hace hoy **ninguna** llamada de red. Las cinco pantallas del embudo
corren con datos de `lib/mock/`, `lib/supabase.ts` existe y no lo importa nadie, y once
`TODO` marcan los puntos de enganche. En paralelo, `Arca-back` tiene la Capa 1
implementada, probada y desplegable, con dos endpoints públicos.

Lo que impide conectarlos no es el cableado: son las divergencias de contrato que se
acumularon mientras cada repo avanzaba por su lado. Los tipos que el front escribió a
mano en `lib/types/` ya no describen lo que el back devuelve. El apéndice A las lista
con su evidencia.

## 2. Decisiones tomadas

Confirmadas por el fundador durante el diseño:

| # | Decisión | Consecuencia |
|---|---|---|
| D1 | El alcance es solo Capa 1 | `/assessment` y `/assessment/results` siguen con mock y disclaimer |
| D2 | `/score` se rediseña sobre las 4 categorías reales de Capa 1 | Desaparecen los 6 dominios de la pantalla de Pre-Score |
| D3 | Las bandas de tier del back (80/65/45/25) son la verdad | Se corrige CLAUDE.md §6.3; el front deja de calcular tier |
| D4 | Las llamadas van directas del navegador a la API | Sin BFF. Se respeta el rate limit por IP real |
| D5 | Un PARTIAL cacheado se repara antes de entregarse | Es el comportamiento actual; solo se corrige la documentación |
| D6 | El TTL de la caché de scans pasa a 7 días y a variable de entorno | `SCAN_CACHE_TTL_MS` |
| D7 | El TTL de la caché de Apify se acopla al anterior | `APIFY_QUERY_CACHE_TTL_MS` a 7 días |
| D8 | Los presupuestos de Apify se registran, no se limitan | Se borra el portón; el ledger se conserva entero |

### D3 en detalle

`lib/score-tiers.ts` usa 85/70/50/30, igual que CLAUDE.md §6.3.
`packages/scoring/src/math.ts` usa 80/65/45/25, fijado en un test parametrizado en
`packages/scoring/tests/math.test.ts`. DN-01 no documenta esa diferencia como desviación
del handbook, y una de sus filas apunta a que el handbook describía "todo positivo" como
80-87.

Gana el back. El principio que lo resuelve está en CLAUDE.md §3: la lógica de negocio
vive en la API y el front no la duplica. Por tanto `tierForScore()` **deja de usarse
para Capa 1**: el front lee `preScore.tier` y `tierStyle()` se reduce a un mapa de
nombre a estilo, ampliado con `UNKNOWN`.

### D4 en detalle

Se descartó meter un BFF en Route Handlers de Next. Habría dado cookie `httpOnly` y un
solo origen, pero rompe tres decisiones del back a la vez: todas las peticiones saldrían
con las IP de Vercel, y el límite de 10 por IP y hora se agotaría para todos los
usuarios juntos. Arreglarlo exigiría reenviar `x-forwarded-for` y subir
`TRUST_PROXY_HOPS`, y una cadena Vercel → Caddy → Hono mal verificada convierte el
límite en falsificable.

El `sessionToken` no es una sesión de usuario: es un capability de 24 horas atado a un
`scanId` concreto, emitido por `apps/api/src/auth/session-token.ts`. Robarlo permite
leer ese scan y nada más. No justifica rediseñar la topología.

El coste de D4 son los previews de Vercel, que quedan fuera de `CORS_ALLOWED_ORIGINS`
porque `config/env.ts` exige orígenes exactos. Se resuelve con un dominio estable de
staging, no abriendo `*.vercel.app`.

---

## 3. Fase 0 — Prerequisitos en Arca-back

Se ejecuta en `Arca-back`. Los puntos 0.1 a 0.3 son cambios que el fundador pidió y que
no dependen de la integración; los puntos 0.4 a 0.8 la habilitan.

### 0.1 TTL de la caché de scans

`apps/api/src/http/app.ts` calcula la ventana con el literal `86400000`. Pasa a
`SCAN_CACHE_TTL_MS` en `apps/api/src/config/env.ts`, con default `604_800_000`.

El número original entró en el commit `7faffe0` al integrar Supabase y nunca se
justificó. DN-06 lo reconoce como pendiente: "TTL iniciales se definen con requisitos de
frescura" y "Calibrar presupuestos, TTL y límites nominales con costo y cobertura
reales". La evidencia que mide la Capa 1 (una AI policy publicada, el bar standing, el
rating de Avvo) cambia en semanas, no en horas.

### 0.2 TTL de la caché de consultas a Apify

`APIFY_QUERY_CACHE_TTL_MS` pasa de `86_400_000` a `604_800_000`, acoplado al anterior.

Sin esto, un dominio que quedó PARTIAL el lunes y recibe visitas el miércoles dispara la
reparación con la caché de Apify ya expirada, y **se repagan los runs de Bar y Avvo en
cada visita durante los 7 días**. Hoy no ocurre porque ambos TTL valen 24 horas y
expiran juntos.

La reutilización del análisis web no se ve afectada: `latestRaw()` en
`apps/api/src/repositories/supabase.ts` coge el último registro del dominio sin filtro
de fecha, y `pipeline/website-source.ts` lo reutiliza cuando coinciden hash de
contenido, proveedor y versión.

### 0.3 Presupuestos de Apify: registrar sin limitar

**Se conserva todo el registro.** Las tablas `apify_runs` y `scan_apify_runs`, las
columnas `cost_usd`, `reserved_usd`, `accounting_complete` y `charged_to_scan`, la
atribución por scan y el flag `PROVIDER_COST_UNKNOWN`. Intacto.

**Se elimina el portón:**

- En `supabase/migrations/…_apify_run_ledger.sql`, función `reserve_apify_run`: el
  bloque que compara `daily_reserved` y `scan_reserved` contra los máximos y devuelve
  `budget_exceeded`, y la excepción `Apify budgets must be positive`.
- En `apps/api/src/config/env.ts`: la validación `per-run <= per-scan <= per-day`, y las
  variables `APIFY_MAX_COST_USD_PER_SCAN` y `APIFY_MAX_COST_USD_PER_DAY`.
- En `apps/api/src/pipeline/apify-client.ts`: `maxTotalChargeUsd` en el arranque del
  actor, que era el techo del lado del proveedor.

**`APIFY_MAX_COST_USD_PER_RUN` no desaparece: se renombra a
`APIFY_EXPECTED_COST_USD_PER_RUN`.** La columna `reserved_usd` es `not null` y se
rellena con ese valor; es lo que hace que los totales signifiquen algo mientras un run
está en vuelo, antes de que Apify reporte el coste real. Sin él, la contabilidad que se
quiere conservar queda ciega justo en los runs activos. Deja de compararse contra nada.

**Cascada de código muerto, que se borra.** Sin portón nunca se emiten:

- `ApifyClientError('BUDGET_EXCEEDED')` en `pipeline/apify-client.ts`
- las ramas de `budget_exceeded` en `pipeline/directories.ts`
- el valor `BUDGET_EXCEEDED` de `code` en `SourceStatus`, en `packages/contracts/src/sources.ts`
- el flag `PROVIDER_BUDGET_EXCEEDED` en `packages/scoring/src/score.ts`

Se borran en vez de dejarse como no-ops porque `preScore.flags` es algo que `/score` va
a pintar, y el front no debe escribir una rama que el back ya no puede producir. Es
exactamente el error que este diseño corrige en 0.4.

**Riesgo asumido.** `maxTotalChargeUsd` era el único tope del lado de Apify. Sin él, lo
único que acota un run individual es `APIFY_RUN_TIMEOUT_SECS` (300 s por defecto), y
nada acota el gasto diario. El ledger dirá cuánto se gastó, pero a posteriori. Si más
adelante se quiere red sin reponer límites, lo natural es una alerta sobre
`daily_reserved` en el sitio donde hoy está el `return 'budget_exceeded'`. No se
implementa ahora.

**Pendiente derivado.** La guarda de calidad de DN-06 ("si falta ciudad, evitar
expansión nacional automática no presupuestada") estaba redactada apoyándose en que
había presupuesto. Hay que verificar que se sostiene sola.

### 0.4 El cache-hit siempre es COMPLETED

Un PARTIAL en caché **no** se devuelve tal cual: el scan se re-ejecuta reutilizando las
cachés calientes y se entrega el resultado reparado (D5). Ese es el comportamiento
actual y no cambia. Lo que cambia es la documentación, que dice lo contrario en cuatro
sitios:

| Sitio | Dice | Debe decir |
|---|---|---|
| `apps/api/src/http/schemas.ts`, `CachedScanResponse.status` | `z.enum(['COMPLETED','PARTIAL'])` | `z.literal('COMPLETED')` |
| `apps/api/src/http/openapi.ts`, descripción de `POST /scan` | "which is COMPLETED or PARTIAL" | solo COMPLETED |
| `README.md` | "reutiliza scans COMPLETED y PARTIAL originales" | solo COMPLETED se reutiliza directamente |
| `apps/api/src/http/app.ts`, junto a `cachedStatus` | comentario "partial stays partial" | se borra |

Contexto histórico, para que no se vuelva a revertir por accidente: el commit `7b4aa93`
("Retry recoverable pages and reuse partial scans") hizo que un PARTIAL cacheado se
devolviera directamente, y el commit `24bd2ee` lo revirtió a propósito. El motivo está
en DN-06: "Un PARTIAL puede reutilizarse desde caché sin reparar la fuente fallida. Hay
que conservar evidencia buena y refrescar solo faltantes". Devolver un PARTIAL tal cual
congela el fallo: si una fuente se cae, todos los visitantes de ese dominio arrastran el
mismo score degradado durante toda la ventana de caché y nadie reintenta.

La migración `…_cache_partial_scans.sql` y los dos repositorios siguen devolviendo filas
PARTIAL desde `cached()`, y eso es correcto: son las que alimentan la reparación.

**Consecuencia para el front:** el `200` rápido de `POST /scan` siempre trae
`status: 'COMPLETED'`. Cualquier PARTIAL llega por el camino lento del polling.

### 0.5 Los esquemas del cable se mueven a `packages/contracts`

`ScanRequest`, `ScanResponse` y `PollResponse` viven hoy en
`apps/api/src/http/schemas.ts`, dentro de la app. Se mueven a `packages/contracts`,
junto a `Layer1Result`. `apps/api` los importa desde ahí. Sin cambio funcional.

### 0.6 Publicar `@arcacover/contracts`

El paquete se publica en GitHub Packages bajo la organización `ArcaCover`. Requiere un
`NPM_TOKEN` en Vercel para que los builds del front resuelvan la dependencia.

### 0.7 Origen de staging en CORS

Añadir un dominio estable de staging (por ejemplo `https://staging.arcacover.com`) a
`CORS_ALLOWED_ORIGINS`. Sin comodines: `config/env.ts` valida que cada entrada sea un
origen exacto.

### 0.8 Fixtures de FAILED y PARTIAL

`SOURCE_MODE=mock` sirve hoy `robust`, `minimal` y `sanctioned.arca.example`, que cubren
COMPLETED, evidencia insuficiente y override disciplinario. Faltan dos escenarios para
que el front pueda desarrollar las ramas de error sin desenchufar la red.

---

## 4. Contrato compartido

`lib/types/assessment.ts` y `lib/types/assessment-results.ts` son tipos escritos a mano
que ya se desincronizaron del back en tres sitios (apéndice A). La corrección es
eliminar la copia, no actualizarla: CLAUDE.md §3 dice que validaciones y tipos se
escriben una sola vez y se comparten.

El front instala `@arcacover/contracts`. Con eso no solo gana los tipos: gana
`Layer1Result.parse()`, es decir validación en runtime en la frontera. Sin ella, un
cambio de contrato llega a producción como un crash de render en `/score` en vez de como
un error legible.

**Qué se borra y qué no.** `lib/types/` no desaparece entero, porque describe también la
Capa 2, que sigue en mock:

| Archivo | Destino |
|---|---|
| `lib/types/assessment.ts` | **Se queda.** Lo consumen `/assessment`, `QuestionCard` y `lib/mock/assessment-questions.ts`, todos fuera de alcance |
| `lib/types/assessment-results.ts` | **Se queda**, con una cabecera que advierta que es el contrato del mock de Capa 2 y no lo que el back devuelve. Su `UnderwritingDecision` tiene 4 valores frente a los 6 del back (A4), y no debe reutilizarse para Capa 1 |
| Todo lo que describa Capa 1 | Viene de `@arcacover/contracts`. `/score` no importa nada de `lib/types/` |

**Plan B si publicar en GitHub Packages se atasca:** `openapi-typescript` contra
`/openapi.json` en un script `sync:contracts`. Da solo tipos, sin validación, así que es
estrictamente peor; se usa únicamente si el `NPM_TOKEN` en Vercel resulta ser un bloqueo
real.

## 5. Flujo de datos y pantallas

### 5.1 Identidad del embudo

El identificador pasa a ser `scanId`, y **email y dominio salen de la URL**. CLAUDE.md §8
prohíbe exponer datos de asegurados en URLs, y hoy viajan por las cinco pantallas en
query params.

El `sessionToken` se guarda en `sessionStorage` bajo una clave por `scanId`. Muere al
cerrar la pestaña, que es lo correcto para un capability de 24 horas.

### 5.2 Recorrido

```
/quote            POST /scan {email, domain}
                    ├─ 202 → /quote/scanning?scan=sc_xxx
                    └─ 200 cached → /score?scan=sc_xxx      (se salta el scanning)

/quote/scanning   GET /scan/:id con Bearer, en bucle
                    └─ COMPLETED | PARTIAL → /score?scan=sc_xxx

/score            GET /scan/:id
```

El cache-hit es el caso que hoy no existe: `POST /scan` puede devolver el resultado al
instante y el front igual esperaría los 25 segundos inventados de
`app/quote/scanning/page.tsx`.

`/score` vuelve a pedir el resultado en vez de recibirlo por estado, para que
`/score?scan=…` sea reproducible desde la URL sola. Es la misma propiedad que el front
ya buscaba con los query params, según el comentario de `app/quote/page.tsx`.

### 5.3 Polling

Cada 2 segundos durante el primer medio minuto, luego cada 5. La barra de progreso deja
de ser una transición CSS de 25 s y pasa a alimentarse de `elapsed`, que el back ya
devuelve en cada respuesta `RUNNING`.

El copy promete "menos de 60 segundos" y `PIPELINE_TIMEOUT_MS` está en 600.000 ms, diez
minutos. A los 60 segundos la pantalla cambia el mensaje ("Taking a little longer —
we're still working"); no miente ni abandona.

### 5.4 Adaptador

Un módulo `lib/api/adapt.ts`, con tests, donde se concentra el riesgo de la integración:

| Lo que pinta `/score` | De dónde sale | Cuidado |
|---|---|---|
| Nombre de la firma | `identity.firmName` | `identity` puede ser `null` entero |
| Ciudad y estado | `identity.city`, `multipliers.jurisdiction.state` | el estado está hardcodeado a `'FL'` en el back |
| Nº de abogados | `signals.website.W5_teamSize` | nullable |
| Práctica | `multipliers.practiceArea.area` | nullable |
| Gauge | `preScore.total` | **puede ser `null`**; el gauge necesita un estado sin número |
| Tier | `preScore.tier` | añadir `UNKNOWN` a `TierBadge` |
| Confianza | `preScore.confidence` | `HIGH` / `MEDIUM` / `LOW` |
| Desglose | `preScore.categories` | 4 barras sobre su `max` (35/30/20/15), no sobre 100 |
| Señales | `signals` + `categories[].rules[]` | traducción a texto, ver 5.5 |

### 5.5 Desglose por categorías (D2)

`/score` deja de pintar los 6 dominios de Capa 2 y pinta las 4 categorías que la Capa 1
realmente mide:

```
Score breakdown

AI Governance & Policy      23 / 35
Professional Standing       30 / 30
Reputation                  14 / 20
Firm Maturity               15 / 15
                            ---------
Pre-Score                   82 / 100
```

`DomainBar` se reutiliza cambiando el denominador. Se descartó derivar los 6 dominios en
el back porque la Capa 1 no observa oversight, training ni incident preparedness:
habría que inventar puntuación para tres de los seis, lo que choca con CLAUDE.md §7.

Los 6 dominios siguen siendo el modelo de `/assessment/results`, que no se toca.

### 5.6 Señales legibles

La traducción de `signals` y `categories[].rules[]` a las tarjetas `{label, source,
positive}` vive en el front, en `lib/signals-view.ts`. Es copy, no regla de negocio, y
`positive` se deriva del signo de `points`, que el back ya calcula. El front sigue sin
decidir nada de scoring.

### 5.7 Componentes compartidos con la pantalla mock de Capa 2

`ScoreGauge` y `TierBadge` los usan **las dos** pantallas: `/score` (en alcance) y
`/assessment/results` (fuera). Sus firmas tienen que cambiar, así que
`/assessment/results` recibe una actualización mecánica aunque ni su contenido ni su
fuente de datos se toquen.

El problema concreto: `ScoreGauge` deriva el tier internamente con
`tierForScore(value)` para elegir el color del arco. Si `/score` pinta el
`preScore.tier` que manda el back y el gauge sigue derivando el suyo del número, los dos
pueden discrepar. Es el mismo fallo que `/assessment/results` ya evita a mano, según su
comentario: *"Derived from the score rather than read from the payload, so the badge can
never disagree with the gauge beside it."*

Refactor de `lib/score-tiers.ts`:

- La clave pasa de número a nombre: `TierName = 'FORTRESS' | 'FORTIFIED' | 'GUARDED' |
  'EXPOSED' | 'CRITICAL' | 'UNKNOWN'`, alineada con `Tier` de `@arcacover/contracts`.
- `tierStyle(name)` devuelve estilo e icono. Hay que definir los de `UNKNOWN`.
- `tierForScore()` **se conserva solo para la pantalla mock de Capa 2**, devolviendo un
  nombre, y con las bandas del back (D3). Un comentario debe dejar claro que no se use
  para Capa 1: ahí el tier lo manda la API.

Firmas resultantes:

- `TierBadge({ tier: TierName })` — `/score` le pasa `preScore.tier`;
  `/assessment/results` le pasa `tierForScore(composite_score)`.
- `ScoreGauge({ score: number | null, tier: TierName })` — el tier deja de derivarse
  dentro y pasa a ser prop, y `score` admite `null` para el caso de `preScore.total`
  nulo.

Comprobado que D3 no altera lo que muestra la pantalla mock: su `composite_score` es 74,
que era FORTIFIED con las bandas viejas (70-84) y sigue siendo FORTIFIED con las nuevas
(65-79).

## 6. Errores y estados

El embudo no tiene hoy **ni una rama de error**: `/quote/scanning` siempre termina bien a
los 25 s. Este es el grueso del trabajo nuevo de UI.

| Situación | Origen | Comportamiento |
|---|---|---|
| `400 invalid_domain` | `DomainResolution`: `INVALID_DOMAIN`, `PERSONAL_EMAIL`, `DOMAIN_UNAVAILABLE` | Vuelve a `/quote` con el mensaje bajo el campo que falló |
| `429 rate_limited` | 10/IP/h o 3/email/h | Mensaje con el `Retry-After` de la cabecera |
| `FAILED` | polling | Pantalla de fallo con reintento |
| `PARTIAL` | polling | Se muestra el score con aviso de evidencia incompleta (`flags`, `sources[].status`) |
| `assessmentStatus: INSUFFICIENT_EVIDENCE` o `decision: UNKNOWN` | `preScore` | No se muestra decisión comercial (CLAUDE.md §7) |
| `preScore.total: null` | `preScore` | Gauge sin número, tier `UNKNOWN` |
| `401` | token expirado, o `sessionStorage` vacío tras recargar | Vuelve a `/quote` |
| Polling sin terminar a los 60 s | `PIPELINE_TIMEOUT_MS` = 600 s | Cambia el mensaje, no abandona |

**Alineación de copy pendiente:** `/quote` avisa hoy sobre gmail y hotmail pero deja
pasar; el back puede rechazar con `PERSONAL_EMAIL`. El texto tiene que decir lo que el
back hace de verdad.

## 7. Verificación

El front no tiene hoy `lint`, ni `typecheck`, ni tests.

- Añadir `typecheck` (`tsc --noEmit`) y `lint` a `package.json`. Hoy nada impide que un
  error de tipos llegue a Vercel.
- **Desarrollo contra el back real en modo mock.** `SOURCE_MODE=mock` y
  `STORAGE_BACKEND=memory` levantan la API en `localhost:8080`, que ya está en
  `CORS_ALLOWED_ORIGINS`. No hay que mockear nada en el front. `minimal` y `sanctioned`
  cubren evidencia insuficiente y override disciplinario; `FAILED` y `PARTIAL` llegan
  con 0.8.
- Tests solo donde está el riesgo: `lib/api/adapt.ts` y `lib/signals-view.ts`, con el
  `Layer1Result` de ejemplo que ya vive en `apps/api/src/http/openapi.ts`. Los
  componentes no.

## 8. Orden de trabajo

| Fase | Repo | Contenido |
|---|---|---|
| 0 | Arca-back | Los ocho puntos de la sección 3 |
| 1 | Arca-front | `lib/api/` (cliente, token, errores tipados); scripts `typecheck` y `lint`; instalar `@arcacover/contracts`; marcar `lib/types/assessment-results.ts` como contrato del mock (sección 4) |
| 2 | Arca-front | `/quote` real: `POST /scan`, errores del back, cache-hit que salta a `/score`, lead persistido |
| 3 | Arca-front | `/quote/scanning` real: polling con `elapsed`, fuera los 25 s, `FAILED` y timeout |
| 4 | Arca-front | `/score` real: refactor de `lib/score-tiers.ts` y de los componentes compartidos (5.7), adaptador, rediseño a 4 categorías, `PARTIAL` / `UNKNOWN` / `null` |
| 5 | Arca-front | Limpieza y honestidad |

**Fase 5 en detalle:**

- Borrar `lib/mock/score-data.ts`.
- Quitar de `app/quote/scanning/page.tsx` los mensajes que prometen tech stack y job
  postings: el back mide website, Florida Bar y Avvo, y nada más (CLAUDE.md §7).
- Actualizar CLAUDE.md: §6.3 con las bandas 80/65/45/25, §9.2 y la lista de TODO.

## 9. Fuera de alcance

- Capa 2 completa: banco de preguntas, selección adaptativa, scoring de 6 dominios y
  resultados. No existe en el back (`packages/questions/` está vacío y sin nada en git).
- Pricing, Stripe y derivación a broker. CLAUDE.md §6.3: "No implementar pricing hasta
  que el fundador lo indique", y no hay carrier.
- Los dos PDF de reporte.
- Supabase Auth con magic links. Cuando entre, toca reevaluar D4: con sesión de usuario
  real, el BFF vuelve a ser la opción correcta.
- Conectar los formularios de `/partners` y `/platforms`.

## 10. Riesgos y puntos abiertos

| # | Riesgo | Estado |
|---|---|---|
| R1 | Sin tope en Apify, nada acota el gasto diario; el ledger informa a posteriori | Asumido (D8). Mitigación documentada, no implementada |
| R2 | Un dominio con una fuente caída de forma permanente re-ejecuta el pipeline en cada petición durante 7 días | Vigilar. Con los TTL acoplados no cuesta dinero, sí latencia |
| R3 | `multipliers.jurisdiction.state` está hardcodeado a `'FL'` cuando hay abogados | El front lo pinta como dato de la firma. Revisar antes de salir de Florida |
| R4 | El `NPM_TOKEN` de GitHub Packages en Vercel puede bloquear los builds | Plan B en la sección 4 |
| R5 | La guarda de expansión nacional de DN-06 se apoyaba en el presupuesto | Verificar en fase 0 |

---

## Apéndice A — Divergencias encontradas en la revisión

Estado de los dos repos a 2026-09-21. `Arca-front` en `0bde778`, `Arca-back` en
`24bd2ee`.

| # | Divergencia | Evidencia |
|---|---|---|
| A1 | Bandas de tier distintas: 85/70/50/30 contra 80/65/45/25 | `lib/score-tiers.ts` frente a `packages/scoring/src/math.ts` |
| A2 | `/score` pinta 6 dominios de Capa 2; la Capa 1 devuelve 4 categorías | `lib/mock/score-data.ts` frente a `preScore.categories` |
| A3 | Tier numérico contra tier nominal, y el front no contempla `UNKNOWN` | `Tier = 1..5` en `lib/score-tiers.ts` frente a `Tier` en `packages/contracts/src/layer1.ts` |
| A4 | Decisiones: el front tiene 4 valores, el back 6 | `lib/types/assessment-results.ts` frente a `Decision` en `packages/contracts/src/layer1.ts` |
| A5 | Señales: lista plana contra objeto estructurado W1-W9 / B1-B4 / A1-A8 | `lib/mock/score-data.ts` frente a `Signals` |
| A6 | El front no contempla `RUNNING`, `PARTIAL`, `FAILED`, `cached`, `flags` ni `overrides` | Las cinco pantallas |
| A7 | La Capa 2 no existe en el back, pero el front tiene tipos para sus tres endpoints | `lib/types/assessment.ts` frente a las rutas de `apps/api/src/http/app.ts` |
| A8 | El front no tiene noción de `sessionToken`; `GET /scan/:scanId` lo exige | `apps/api/src/auth/session-token.ts` |
| A9 | Email y dominio viajan en query params por las cinco pantallas | CLAUDE.md §8 |
| A10 | Los previews de Vercel quedan fuera de CORS | `CORS_ALLOWED_ORIGINS` y la validación de `config/env.ts` |
| A11 | El front no valida en runtime; el back valida todo con zod | `lib/` no tiene zod |
| A12 | `/quote/scanning` promete tech stack y job postings; el back no los mide | `MESSAGES` en `app/quote/scanning/page.tsx` |
| A13 | `lib/supabase.ts` existe y no lo importa nadie | `grep getSupabase` |
| A14 | El front no tiene `lint`, `typecheck` ni tests | `package.json` |
