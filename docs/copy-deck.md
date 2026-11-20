# Arca — Inventario de textos del sitio

Transcripción literal de la landing tal como está hoy en el código. Nada reescrito, nada corregido.
Los textos del sitio van en **inglés** porque ese es el mercado; las etiquetas y notas de este documento van en español.

- **Última actualización:** 9 noviembre 2026 (se añaden la sección 10: el fallo de `/quote/scanning`, y el aviso de evidencia y el botón del PDF de `/score`; y la sección 11: el aviso único de demo, la tarjeta de pregunta, las notas y el botón del PDF de la Capa 2)
- **Secciones:** 13 — las 10 de la landing, en orden de lectura, una del embudo de cotización, una de la Capa 2 y una de las cuentas reales de la webapp
- **Estado:** pre-lanzamiento

> Si cambias un texto en el código, **actualízalo también aquí**. Este archivo está
> referenciado desde CLAUDE.md §9.1.

**Leyenda de marcas**

- 🔴 **Ficticio** — dato inventado, no puede publicarse
- 🟡 **Revisar** — pendiente de verificar o de validar con abogado

---

## 00 · Metadatos / SEO

*No se ve en pantalla — es lo que aparece en la pestaña del navegador y en Google.*

| Campo | Texto |
|---|---|
| Título (51 car.) | Arca: AI Liability Insurance for the Legal Industry |
| Descripción (160 car.) | Arca covers what your professional liability policy doesn't: malpractice, faulty automated decisions, and regulatory exposure from the AI tools you already use. |
| Imagen al compartir | `public/og.png` (1200×630), resuelta contra `https://arcacover.com` |
| Texto alternativo | Arca — coverage for the mistakes AI makes in your name. |

---

## 01 · Navbar

*Barra fija arriba.*

**Menú "Coverages"**
- AI Professional Malpractice → `/coverage`

**Menú "Industries"**
- Legal

**Menú "Partners"**
- Producers
- Platforms

**Zona derecha**
- My account
- Get a quote 🟡 *(sin acción — el botón dorado solo aparece al bajar; arriba del todo no está)*

**Móvil, para lectores de pantalla**
- Open menu / Close menu

---

## 02 · Hero

*Primera pantalla.*

**Badge rotativo** — rota cada 3 s en este orden fijo; con movimiento reducido se queda en la primera:

1. Built for independent lawyers
2. Built for law firms
3. Built for legal partnerships

**Titular (H1)**

> Insurance for lawyers who rely on AI.

**Subtítulo**

> AI moves faster than the risks it creates. Arca is the eye that watches over your practice, from AI-drafted errors to automated decisions, so you stay protected.

**Botón**
- Get a quote 🟡 *(sin acción)*

> **Regla de audiencia:** "lawyers" y no "law firms", porque el badge nombra también al abogado independiente y a la sociedad. Por lo mismo el cierre es "so you stay protected", no "your firm".

---

## 03 · Cinta 1 — las herramientas

*Bajo el orbe, en movimiento continuo. Va en opacidad reducida, como lista de integraciones.*

**Micro-título**
- Protecting firms that use

**Los seis nombres, en este orden**

1. Harvey
2. CoCounsel
3. Lexis+ AI
4. Microsoft Copilot
5. ChatGPT
6. Google Gemini

> **Por qué no dice "Trusted by":** no son clientes ni socios nuestros. La frase dice que
> aseguramos a firmas que usan estas herramientas, no que estas herramientas trabajen con
> Arca. 🟡 *Nombrar marcas de terceros sin acuerdo conviene revisarlo con abogado.*

---

## 04 · Your policy was written before AI

*Estadísticas + tres tarjetas animadas.*

**Titular (H2)**

> Your policy was written before AI.

**Subtítulo**

> Most professional liability policies don't mention artificial intelligence. The ones that do, exclude it.

**Las tres cifras** 🔴 *(sin fuente verificable)*

| Cifra | Texto |
|---|---|
| 69% | of legal professionals now use generative AI at work |
| $500K–$2M | cost of a single AI-related malpractice event |
| 7 of 13 | major malpractice insurers report rising AI claims |

### Tarjeta 01 — When AI gets it wrong

> An AI-drafted brief cites a case that doesn't exist. A model misreads a reconciliation. Your client sues.

En la animación aparece la etiqueta **"citation not found"**.

### Tarjeta 02 — When your policy says no

> You file the claim. Your carrier points to the AI exclusion. You're covering the defense yourself.

Textos de la barra: "POLICY LIMIT" · "$10M" · "AI sub-limit: $500K" · "not covered for AI" · sello "ILLUSTRATIVE EXAMPLE".
Al pasar el ratón muestra "covered for AI" / "not covered for AI".

### Tarjeta 03 — When the regulator calls

> Bar associations and state courts are writing AI rules. Non-compliance is a disciplinary matter, not just a claim.

Feed en bucle 🔴 *(eventos inventados)*:
- State court issues AI disclosure guidance for filings
- Bar association opinion on supervising AI-assisted work
- Regulator opens consultation on automated advice
- Disciplinary action reported over unverified AI output

*Cada uno lleva debajo, a la vista del visitante: "PLACEHOLDER · JURISDICTION · DATE".*

---

## 05 · Cinta 2 — los riesgos

*Entre el problema y la solución, en movimiento continuo. A plena opacidad: aquí el texto sí tiene que pesar.*

**Micro-título**
- The risks your current policy ignores

**Los ocho escenarios, en este orden**

1. A hallucinated citation in your brief
2. A client sues over biased AI advice
3. Your AI tool exposes privileged data
4. A regulator audits your AI workflow
5. An AI-drafted contract with wrong terms
6. Your AI vendor goes down during trial prep
7. A bar complaint over undisclosed AI use
8. A breach in AI-assisted due diligence

> Son escenarios en segunda persona, no nombres de cobertura. Sustituyen a la cinta de las
> 8 coberturas, que ya no aparece en la landing (ver apéndice).

---

## 06 · Products

*Recorrido del producto.*

**Titular (H2)**

> Coverage for the mistakes AI makes in your name.

**Subtítulo**

> One policy built for the risks your current coverage ignores.

**Eyebrow**
- From assessment to coverage

**Entradilla**

> Your firm's website tells us more than you think. We start with what's already public, then ask only what we couldn't find.

**Los cuatro pasos**

| # | Título | Descripción |
|---|---|---|
| 01 | Know your risk in minutes | Enter your firm's website and email. Arca's Score Engine scans public signals automatically — no forms, no questions yet. |
| 02 | See where you stand | A clear picture of how your AI use holds up — what's solid, what's exposed, and where to fix it first. |
| 03 | Get real numbers | Three coverage options, ready to compare — clear pricing, no waiting on a quote. |
| 04 | Bind in minutes | Sign electronically, choose how you pay, and the policy is issued. |

---

## 07 · Panel del producto

*Las cuatro escenas sobre el vídeo de océano. Cada paso de la sección anterior enciende una escena.*
*Son maquetas de un producto que aún no funciona: todos los números de aquí son ilustrativos.*

### Escena 01 — El escaneo

- Encabezado: **AI GOVERNANCE SCAN** · "Under 60 seconds"
- Campos: *Firm website* → `yourfirm.com` · *Work email* → `you@yourfirm.com`
- Mientras escanea, va diciendo:
  - Reading your website
  - Checking your tech stack
  - Checking public records
- Resultado: **72/100** 🔴 · etiqueta dorada **HIGH CONFIDENCE** · "Pre-score, nothing asked yet"

### Escena 02 — El cuestionario

- Encabezado: **AI GOVERNANCE SCORECARD** · contador "1 of 5"
- Las cinco preguntas:
  1. Which AI tools does your firm use for client work?
  2. Who reviews AI-assisted work before it leaves the firm?
  3. Does client data ever go into a consumer AI tool?
  4. Do you have a written AI policy your team follows?
  5. Has your team been trained on where AI gets things wrong?
- Al pie: "Only what the scan couldn't answer on its own"

### Escena 03 — Resultado y precios

- Marcador: **86/100** 🔴 · bajo el arco "LOWER" / "STRONGER"
- Insignia: **FORTIFIED**
- Al lado: "Your AI governance holds up well"
- Dos hallazgos:
  - **Strong:** Human review process
  - **Watch:** Data handling
- Las tres cotizaciones 🔴 *(primas inventadas)*:

| Plan | Prima | Límite |
|---|---|---|
| GOOD | $3,150 | $500K |
| BETTER *(destacado)* | $4,420 | $1M |
| BEST | $6,900 | $2M |

- Bajo cada precio: "per year"
- Al pie: "Three options, ready to compare — no underwriter call."

### Escena 04 — La emisión

| Paso | Detalle |
|---|---|
| Signed | Warranty statement · e-signature |
| Payment confirmed | Secure payment processed |
| Policy issued | Documents in your inbox |

- Cierra con la insignia **ACTIVE!**

---

## 08 · Testimonials

*Tarjeta única con tres testimonios alternables.*

> 🔴 **Firmas, citas y métricas son inventadas en su totalidad.** Arca no tiene carrier ni ha emitido pólizas, así que ninguno de estos resultados ha ocurrido.

**Titular (H2)**

> What our clients say.

**Subtítulo**

> How legal teams are closing the gap in their AI coverage.

### Northwind Legal

- **Titular:** How Northwind Legal contained AI hallucination risk
- **Cita:** "We were drafting with AI months before anyone asked who covers it. Arca answered that in an afternoon."
- **Autor:** Jordan Ellis, Managing Partner
- **Métricas:** $2.5M — Coverage limit secured · 100% — Audit trail compliance

### Vanguard Legal Group

- **Titular:** How Vanguard Legal Group put a review process behind every AI draft
- **Cita:** "The assessment found gaps our own partners had missed. Fixing them lowered what we pay."
- **Autor:** Priya Shah, Chief Legal Officer
- **Métricas:** 18 pts — Governance score gain · 6 days — From scan to bound

### Apex Partners Law

- **Titular:** How Apex Partners Law covered the work its AI tools touch
- **Cita:** "Our old E&O policy went quiet on AI. This one says exactly what happens when a tool gets it wrong."
- **Autor:** Daniel Rees, Head of Risk
- **Métricas:** 42 — Attorneys covered · 3 hrs — Total partner time spent

---

## 09 · Pre-footer y footer

*Cierre sobre el vídeo de océano.*

**Titular de cierre**

> Don't navigate AI risk alone

**Subtítulo**

> Whether you're exploring coverage or ready to get a quote, we're here.

**Botón**
- Start a conversation → Calendly `arcacover/discovery`, en pestaña nueva

### Footer

**Contact**
- hello@arca.com 🔴 *(correo de relleno, y con un dominio que ya no es el nuestro — sería @arcacover.com)*
- Questions? We'd love to hear from you.

**Resources**
- Terms of Service
- Privacy Policy
- FAQ

**Company**
- Partners
- Blog
- Careers

**Follow us**
- LinkedIn · X *(solo iconos, sin enlaces todavía)*

**Aviso legal**
- © 2026 Arca. All rights reserved.

---

## 10 · Embudo de cotización — `/quote/scanning` y `/score`

*Fuera de la landing. Aquí solo están los textos que se reescribieron en noviembre de 2026
tras el primer scan real del fundador: el fallo del scan, el aviso de evidencia y la descarga
del informe. El cuestionario y sus resultados están en la sección 11. El resto del embudo
(formulario de `/quote`, mensajes de espera, tarjetas de señales) sigue sin transcribir.*

### `/quote/scanning` — cuando el scan falla

**Titular**

> We couldn't finish your scan

**Texto** — el motivo y, siempre, la misma frase final:

> *[motivo]* Please try again shortly.

| Cuándo | Motivo |
|---|---|
| El scan termina `FAILED` | Something went wrong on our side, or a source we rely on was temporarily unavailable. |
| Pasan 11 minutos sin resultado | The scan is taking longer than expected. |
| Se pierde el contacto con la API (sin red, o la API no responde) | We lost contact with the scan service. Check your connection. |
| La API responde con un error hasta agotar la espera | El mensaje de la API |

**Botón**
- Try another scan → `/quote`

> **Qué cambió.** Antes decía "We could not read enough about your firm to score it. This
> usually means the site blocked us…". Ya no es verdad: una web que no se puede leer **por
> ninguna causa del propio sitio** (el `robots.txt` lo prohíbe, 401/403 o una página de
> verificación, DNS que no resuelve, conexión rechazada, plazo agotado, 5xx, `robots.txt`
> inalcanzable) ya **no** hace fallar el scan. Termina con resultado y pasa a `/score` (ver
> abajo). `FAILED` queda para fallos nuestros (almacenamiento, el pipeline, la extracción del
> modelo sobre páginas que sí se leyeron, nuestro plazo), y por eso el texto pide reintentar y
> no sugiere usar otra dirección. Antes de noviembre de 2026 solo las causas definitivas
> terminaban con resultado; las transitorias también fallaban (DN-12 §14 en Arca-back).

### `/score` — aviso de evidencia

*Un solo bloque, siempre visible, encima del nombre de la firma. Dice cuál de los tres casos
aplica (con evidencia insuficiente para puntuar cambia su cierre; ver la subsección siguiente). Nunca imprime flags ni códigos internos, y nunca nombra una decisión ni un precio.*

**Caso 1 — respondieron las tres fuentes** *(fondo bruma, icono de información)*

> All three public sources answered: your website, the Florida Bar register and Avvo.

Si aun así la evidencia no alcanza para suscribir, se añade:

> What they show is not enough for a coverage decision on its own.

*(Esta segunda frase antes no salía cuando todas las fuentes habían respondido: el aviso
entero solo aparecía si faltaba alguna fuente.)*

**Caso 2 — faltó alguna fuente** *(fondo oro suave, icono de aviso)*

Una frase por tipo de hueco, en este orden, y después el cierre:

| Qué pasó | Frase |
|---|---|
| La web se leyó solo en parte | We could only read part of your website. |
| Un directorio no respondió (error o tiempo agotado) | The Florida Bar register did not answer. · Avvo did not answer. · The Florida Bar register and Avvo did not answer. |
| Un directorio respondió a medias | The Florida Bar register answered only in part. · Avvo answered only in part. |
| Un directorio no se llegó a consultar (no había datos suficientes de la firma para buscarla) | We could not look your firm up in the Florida Bar register. · …on Avvo. · …in the Florida Bar register or on Avvo. |

**Cierre**

> This score rests on less evidence than usual.

Y, si la evidencia no alcanza para suscribir:

> It is not enough for a coverage decision on its own.

Si el scan quedó parcial pero ninguna fuente lo explica, la frase es una sola:

> Part of the public evidence could not be read, so this score rests on less evidence than usual.

**Caso 3 — no se pudo leer la web de la firma** *(fondo oro suave, icono de aviso)*

*Sale cuando el resultado trae el flag `WEBSITE_UNAVAILABLE` o cuando la fuente web no se pudo
usar. Es el único aviso de la pantalla para este caso. En el lugar del score no hay número ni
tier: sale el estado "No score from public evidence" (subsección siguiente). La tarjeta "Refine
your score" sube y queda justo debajo: el cuestionario es la acción principal.*

> We could not read your firm's website, so we have no public evidence to score. The
> assessment below gives you a score based on your answers, marked as low confidence. This is
> not a coverage decision.

Es igual para cualquier causa (negativa del sitio, DNS, plazo, 5xx…) y para cualquier tier que
mande la API: la API sigue enviando 0 y `CRITICAL`, pero la pantalla no los enseña.

> **Qué cambió (decisión de Jesús del 2026-11-17, DN-12 §14 en Arca-back).** Antes decía que lo no
> verificado "places your firm in the highest-risk group for now" y que el caso "will need a
> manual review", con el 0 y el `CRITICAL` en el gauge. Esa era la decisión D4: una web ilegible
> como grupo de mayor riesgo con revisión manual (override `REFERRAL_SENIOR`). Se sustituyó: una
> web que no se pudo leer no dice nada malo de la firma, solo que no tenemos evidencia pública.
> Se presenta como **confianza baja**, no como alto riesgo, y el cuestionario puntúa solo con las
> respuestas. Nunca volver a escribir "highest-risk group" ni "manual review" para este caso.

### `/score` — sin evidencia suficiente para puntuar

*Dos estados hermanos, los dos sin número, sin tier y sin el gauge (`notRated` en
`lib/api/adapt.ts`, con `reason`). El PDF del Quick Scan aplica los mismos (`scoreWithheld`,
DN-12 §12 y §14 en Arca-back).*

**Web ilegible (`reason: "website_unavailable"`)** — *caso 3 del aviso; va primero, también para
una web caída sin flag.* Un bloque bruma con icono de ayuda:

> **No score from public evidence**
>
> Confidence: low

*No repite la frase del aviso: el porqué se dice una vez, arriba.*

**Evidencia escasa (`reason: "thin_evidence"`)** — *sale cuando la confianza es baja (`LOW`) y la
Capa 1 pudo evaluar menos de 2 de sus 4 categorías (cuenta toda categoría que no esté
`UNKNOWN`, también las parciales). No sale con la web ilegible, que tiene el estado de arriba.
La regla vive en `hasInsufficientEvidence`.*

En lugar del gauge, el tier y la línea de confianza, un bloque bruma con icono de ayuda:

**Titular**

> Not enough evidence to rate

**Texto**

> We could evaluate only *{n}* of 4 areas from public sources, so we are not showing a score.
> The assessment below fills in what public sources cannot show.

Si no se pudo evaluar ninguna, la primera frase es:

> We could not evaluate any of the 4 areas from public sources, so we are not showing a score.

*"Refine your score" sube justo debajo, como en el caso 3: es la acción principal. Las barras
de categoría, las señales y el botón del PDF no cambian.*

**Aviso de evidencia en este caso.** Solo dice qué fuentes fallaron y cierra con la frase de
decisión; no habla de "this score", porque no hay score en pantalla:

> *[frases de hueco del caso 2]* This is not a coverage decision.

Con las tres fuentes respondiendo:

> All three public sources answered: your website, the Florida Bar register and Avvo. This is
> not a coverage decision.

Si ninguna fuente explica el hueco: "Part of the public evidence could not be read. This is not
a coverage decision."

**Webapp (`/app`).** Un análisis guardado solo con scan en cualquiera de los dos estados no
muestra número ni tier de riesgo: la lista y la comparación dicen "—" y "NOT SCORED", y la
tarjeta muestra el gauge vacío con "NOT SCORED" y, en lugar de la línea de decisión, una frase
(`notRatedText`):

| Estado | Frase |
|---|---|
| Web ilegible | We could not read your firm's website, so we have no public evidence to score. |
| Evidencia escasa | We could evaluate only *{n}* of 4 areas from public sources, so we are not showing a score. |

Un análisis con assessment de una web ilegible (flag `LAYER1_UNAVAILABLE`) enseña el score de
las respuestas y su tier, con la línea de `/assessment/results`: "Based only on your answers; no
public evidence could be verified (low confidence)."

> **Por qué (noviembre 2026).** Un scan real de hklaw.com mostró "3 / 100 CRITICAL" cuando solo
> se pudo evaluar una de las cuatro categorías (Professional Standing, parcial) y la confianza
> era baja. Se leía como un juicio sobre la firma y era un hueco en lo que pudimos ver.

### `/score` — descarga del informe

*Botón secundario (contorno marino, icono de descarga) debajo del nombre de la firma, en el
bloque del score. El dorado queda para "Refine your score".*

| Estado | Texto |
|---|---|
| Normal | Download report (PDF) |
| Generando | Preparing your report… |
| Error (junto al botón) | We could not prepare your report. Please try again. |

*Antes era el enlace gris "Download Quick Scan Report", al final de la página.*

### `/score` — otros textos retocados

- **Confianza:** Confidence: high · Confidence: medium · Confidence: low *(antes el valor
  salía en mayúsculas, tal cual llega de la API)*
- **Barras de categoría:** "partial evidence" cuando la categoría se puntuó a medias y
  "no evidence" cuando no se pudo puntuar *(antes las dos decían "partial evidence")*

---

## 11 · Capa 2 — `/assessment` y `/assessment/results`

*Fuera de la landing. Textos de las pantallas del cuestionario y de sus resultados tal como
quedaron en noviembre de 2026, tras el primer scan real del fundador. Las preguntas, sus
opciones, las ayudas y el texto de cada paso del plan los manda la API (banco de preguntas
provisional) y no se transcriben aquí.*

### Aviso de demo — uno solo por pantalla

*Bloque dorado suave con icono de escudo, arriba de la columna principal, en **todas** las
pantallas de Capa 2 (carga, pregunta, repaso, error, resultados). Es el único sitio donde la
pantalla dice que es una demo, y es lo que cumple la regla de honestidad (CLAUDE.md §7).*

> **Demo assessment.** The questions and the scoring are provisional, so your results are
> illustrative. This is not an insurance offer, a price or an underwriting decision.

> **Qué cambió.** La misma idea salía 3-4 veces en cada pregunta, 6 en el repaso y entre 14 y
> 24 en los resultados. Se retiraron las repeticiones:
>
> | Antes | Ahora |
> |---|---|
> | Etiqueta "DEMO WORKSPACE" junto al logo | *(retirada)* |
> | Demo question bank 0.1.0-demo.1 · 8 scored questions · Follow-ups add context | *(retirada; un tiempo quedó "Question bank 0.1.0-demo.1")* |
> | Review your answers before we calculate your demo score. | Review your answers before we calculate your score. |
> | …I understand this uses provisional demo rules and is not an insurance application or coverage decision. | …I understand this is not an insurance application or a coverage decision. |
> | See my demo score | See my score |
> | Your demo outlook | Your outlook |
> | This combined score uses the demo scoring model. It is a starting point… | This score combines the public evidence with your answers. It is a starting point… |
> | Commercial decisions are blocked for this demo. This score does not establish eligibility for insurance. | *(retirada: lo dice el aviso)* |
> | Point gains reflect the provisional demo model, not a promised outcome. | Each point gain is an estimate on its own, not a promised outcome. |
> | Illustrative next step: X. This estimate is independent of other steps and is not a pricing or coverage promise. *(en cada paso)* | Next step: X. |
> | Up to +N demo points | Up to +N points |
> | No additional improvements were identified by this demo model. | No additional improvements were identified from your answers. |
>
> Las versiones del banco y del modelo llevan la palabra "demo" dentro de su identificador
> (`0.1.0-demo.1`, `layer2-demo-fixed-coverage-0.1.0`). Desde la segunda revisión (hallazgo 13)
> las preguntas y el repaso **ya no muestran la versión del banco**, y los resultados la dejan
> en una sola línea pequeña del pie con el número y sin la palabra: "Question bank 0.1.0 ·
> Scoring model 0.1.0". Los identificadores completos siguen en el PDF y en el panel State de
> depuración.

### `/assessment` — tarjeta de pregunta

*Cada frase sale una sola vez, aunque la API la mande repetida.*

| Elemento | Texto | Cuándo |
|---|---|---|
| Etiqueta junto al dominio | Context only · does not affect your score | Preguntas de seguimiento, que no puntúan. La frase de la ayuda de la API que repite esto ("This follow-up adds context and does not change the demo score.") no se imprime; si la ayuda dice algo más, el resto se conserva. |
| Caja de contexto | *(frase de la API)* + enlace **View source** | El enlace sale cuando la evidencia citada tiene dirección; si la misma frase se cita con varias direcciones, sale un enlace por cada una. Esa evidencia ya no se repite en la lista de abajo. |
| Desplegable | Evidence from your quick scan (N) | Solo si queda evidencia distinta de la frase de contexto. N cuenta lo que se lista. |
| Evidencia con enlace | View source | |
| Evidencia sin enlace | Recorded scan signal · no source link | |
| Selección múltiple | Select all that apply. | Solo si la ayuda de la API no lo dice ya. |
| Sugerencia | A suggestion to review · Public evidence may be incomplete. Confirm this yourself, or choose a different answer below. · Use this answer | *(sin cambios)* |

*Bajo la tarjeta ya no hay nada: la línea "Question bank [versión]" se retiró.*

### `/assessment` — repaso final

**Titular**

> One last look.

**Texto**

> Review your answers before we calculate your score. You can still change anything.

**Casilla de confirmación**

> I confirm these answers are accurate to the best of my knowledge. I understand this is not
> an insurance application or a coverage decision.

**Botón**
- See my score *(mientras calcula: Calculating…)*

### `/assessment/results` — tarjeta superior

**Etiqueta**

> Your outlook

**Titular y texto**

| Caso | Titular | Texto |
|---|---|---|
| Hay score combinado | Your practices, in perspective. | This score combines the public evidence with your answers. It is a starting point for reviewing your AI practices. |
| La web no se pudo leer (flag `LAYER1_UNAVAILABLE`): el score es solo el de las respuestas | Your practices, in perspective. | Based only on your answers; no public evidence could be verified (low confidence). |
| No hay score combinado | More evidence is needed. | The quick scan did not support a combined score. Your questionnaire score is still available below. |

**Descarga del informe** — *botón secundario (contorno marino, icono de descarga) dentro de la
tarjeta superior. Desde sm, a la derecha del score y bajo el texto; en un móvil, justo debajo
de la insignia del tier y antes del texto, para que quepa en la primera pantalla como en
`/score` (en 390×844 queda a 672-714 px; antes a ~910). En móvil los resultados ocultan además
la descripción de la columna lateral. El PDF lo genera la API con los datos guardados.*

| Estado | Texto |
|---|---|
| Normal | Download report (PDF) |
| Generando | Preparing your report… |
| Bajo el botón, siempre | The download works during this 24-hour session. |
| Error (junto al botón) | We could not prepare your report. Please try again. |
| La sesión del scan terminó | This session has ended, so the report can no longer be downloaded here. |

**Web ilegible** — *ya no hay bloque de aviso aparte. Con el flag `LAYER1_UNAVAILABLE` (la API lo
pone cuando la Capa 1 traía `WEBSITE_UNAVAILABLE`) el score combinado es el de la Capa 2, la
casilla "Public evidence · Layer 1" dice "Not scored" y la línea bajo el titular es:*

> Based only on your answers; no public evidence could be verified (low confidence).

*Una sola vez en la pantalla. El PDF de la Capa 2 la imprime en tercera persona: "Based only on
the firm's answers; no public evidence could be verified (low confidence)."*

> **Qué cambió (decisión de Jesús del 2026-11-17, DN-12 §14 en Arca-back).** Antes salía un bloque
> oro con "This outlook is in the highest-risk group… needs a manual review whatever your
> answers show" (o "Until it can be read, this outlook needs a manual review…"), y el compuesto
> era Capa 1 × 0,3 + Capa 2 × 0,7 con la Capa 1 a 0, así que no pasaba de 70. Ahora el compuesto
> es la Capa 2 entera y la pantalla lo dice como confianza baja, sin grupo de riesgo ni revisión
> manual.

### `/assessment/results` — plan de acción

**Titular**

> A path forward.

**Texto** — *la única advertencia del plan; antes se repetía en cada paso*

> Suggested improvements based on your answers. Each point gain is an estimate on its own, not
> a promised outcome.

**Cada paso:** el título (la pregunta), **Next step:** *[opción siguiente, de la API]* y la
etiqueta **Up to +N points**.

**Sin pasos**

> No additional improvements were identified from your answers. This is not an assurance that
> all risks are addressed.

### `/assessment/results` — Notes for review

*Desplegable "Notes for review (N)". Antes imprimía todos los flags internos del resultado en
minúsculas ("provider cost unknown", "demo bank not approved"…). Ahora solo redacta los flags de
esta lista, en este orden; cualquier otro flag, conocido o nuevo, no imprime nada, y si no
aplica ninguno el bloque no aparece.*

| Flag | Frase |
|---|---|
| `NO_AI_POLICY` | Your answers say the firm has no AI policy yet. |
| `CONSUMER_AI_IN_CLIENT_WORK` | Free or personal AI accounts are used for client work. |
| `NO_HUMAN_REVIEW` | AI-assisted work reaches clients without a lawyer’s review. |
| `NO_CITATION_REVIEW` | AI-generated citations are not checked consistently. |
| `NO_DATA_SAFEGUARDS` | No consistent safeguards protect client information in AI tools. |
| `ANSWER_CONTRADICTS_WEBSITE` | One answer does not match what the scan read on the firm’s website. |
| `INCOMPLETE_SCORED_COVERAGE` | Some areas were scored on fewer answers than planned. |
| `INCOMPLETE_SOURCES` | The quick scan could not gather all the public evidence, so that part of the score rests on less than usual. |
| `INCOMPLETE_EVIDENCE` o `INSUFFICIENT_EVIDENCE`, sin `INCOMPLETE_SOURCES` | The public evidence about the firm was limited, so that part of the score rests on less than usual. |

*De las dos últimas sale como mucho una: si falta una fuente, la primera; si todas
respondieron pero la evidencia fue escasa (el perfil `minimal`), la segunda, que cuadra con lo
que dice `/score` en ese caso ("All three public sources answered… not enough for a coverage
decision on its own"). Antes las tres flags compartían la primera frase, que daba a entender un
fallo de recogida que no había ocurrido (hallazgo 12). Ninguna de las dos sale con la web
ilegible: la línea "Based only on your answers…" ya lo dice.*

**Pie** — *dos líneas pequeñas*

> Completed *[fecha]*
>
> Question bank *[versión]* · Scoring model *[versión]*

*La fecha va en la zona horaria del visitante, no en UTC: una firma de Florida que termina por
la noche ya no lee la fecha de mañana. Las versiones son solo el número (`0.1.0`), sin la
palabra "demo", que ya dice el aviso.*

### `/assessment/results` — guardar los resultados

*Rediseñado el 2026-11-21 (DN-13 §19): es la entrada al pre-checkout. Bloque marino entre las notas y el pie, con el botón
dorado como única acción principal. Todo lo que promete existe hoy en `/app` (análisis guardados, plan de acción con
responsable y fecha, miembros con roles, actividad); la monitorización no sale porque sus alertas siguen siendo de
muestra. El precio sale de `GET /plans`, nunca escrito en el código.*

| Elemento | Texto |
|---|---|
| Antetítulo | Keep these results |
| Título | Keep {Firm}'s results and start closing the gaps. (sin nombre en el scan: Keep your firm's results and start closing the gaps.) |
| Subtítulo (visitante) | Your ARCA workspace in five short steps. Nothing is charged before the last one. |
| Resumen del resultado | {score} / 100 (o "– not scored") · insignia del tier · {n} next steps in your action plan (1: next step) |
| Ventaja 1 | Your analysis, saved — This score and its evidence stay with the firm, past this tab's 24 hours. |
| Ventaja 2 | An action plan to work through — Each next step with an owner, a due date and its status. |
| Ventaja 3 | Your colleagues, with roles — Invite partners and staff as admins, members or viewers. |
| Ventaja 4 | A record of every change — Who did what, in an activity log owners and admins can read. |
| Botón (visitante) | Activate your account |
| Botón (con sesión, a otra organización) | Save your results to a new organization |
| Botón (con sesión, a su organización pagada) | Save your results |
| Precio | From {mensual}/month · Annual saves {n} months (los meses salen de comparar 12 mensualidades con el anual; sin ahorro de al menos un mes, solo el mensual) |
| Confianza | Secure payment by Stripe · Cancel anytime from Billing |
| Vista previa (solo si la tarjeta es ancha, decorativa) | {Firm} · Owner · Action plan · las 3 primeras acciones del resultado en "To do" · Invite a colleague |

*Antes: bloque blanco "Keep these results." con el botón "Save your results and activate your account".*

*El bloque Sale en `mock` y en `live-debug`, y en
producción solo con `NEXT_PUBLIC_WEBAPP_ENABLED=true` (cuentas reales, DN-13); sin ella, no sale.
Con cuentas reales no lleva la línea de simulación. En
`live-debug` (scan real, cuenta simulada) lleva debajo del botón una línea más, la misma que
muestran `/app/login`, `/app/signup`, la invitación, `/app/billing` y el checkout simulado:*

> Simulated in live-debug: this account and its payment are held in memory for this debug session and reset when the API restarts.

*En `mock` esa línea no sale: la franja ya dice que nada es real.*

---

## ⌦ Apéndice — texto retirado de la landing

Sigue en el código, ya no se ve en la página. Se guarda aquí porque el destino previsto es
la página Partners o una futura About.

### Cinta de coberturas — *"What we cover"*

*Estaba bajo el orbe. La sustituyen las dos cintas nuevas (§03 y §05).* El componente vive
ahora en `components/landing/CoverageBelt.tsx`, intacto y sin renderizar. Los ocho nombres
siguen en `lib/coverages.ts`, pero **ya no aparecen en ninguna parte del sitio**: el menú
"Coverages" del navbar solo dice "AI Professional Malpractice".

**Third-party** — cuando el cliente del asegurado sufre el daño
1. AI Work Product Errors
2. AI Regulatory Sanctions
3. AI Bias & Discrimination
4. AI Privacy & Confidentiality Breach

**First-party** — costos directos del asegurado
5. Error Remediation
6. AI Forensic Investigation
7. Crisis Management
8. Regulatory Compliance Costs

🟡 *Nombres sin validar con abogado ni carrier.*

### What we do

*Componente `ValuePillars.tsx`, intacto y sin consumir.*

**Titular (H2)**

> What we do.

**Subtítulo**

> Insurance built around how your practice actually uses AI — not adapted from a generic tech policy.

| # | Pilar | Descripción |
|---|---|---|
| 01 | Plain-English coverage | Policies written in language attorneys actually use — no jargon, no fine print games. |
| 02 | Built for how AI fails in practice | Coverage designed around the real ways AI creates exposure — from a hallucinated citation to a disciplinary complaint. |
| 03 | A digital process, start to finish | From assessment to bound policy, everything happens online, at the speed your firm needs. |

### How we operate

*Componente `HowWeOperate.tsx`, intacto y sin consumir. Era el texto regulatorio del sitio.*
🟡 **Pendiente de validar con abogado.**

#### Managing General Agent (MGA)

> Arca underwrites, issues, and manages every policy on behalf of the insurance carrier that assumes the risk.

#### Surplus lines

> Because AI risk is new and still evolving, our coverage is placed in the surplus lines market — built for risks the standard market hasn't caught up to yet.

#### Building toward Lloyd's coverholder status

> We are working toward Lloyd's coverholder status — a goal we're pursuing, not a status we hold today.

> ⚠️ Era el único punto donde el sitio decía explícitamente que lo de Lloyd's **todavía no
> está conseguido**. Al retirar la sección, **esa aclaración ya no está en la landing.** Si
> en algún momento el sitio vuelve a insinuar el estatus de Lloyd's, la frase tiene que
> volver con él.

---

## ↯ Qué no puede salir así

Todo lo marcado arriba, reunido. Es texto que hoy afirma cosas que no han ocurrido o que no están verificadas — en una aseguradora eso no es un detalle de redacción.

| Dónde | Qué dice | Problema |
|---|---|---|
| Testimonials | 3 firmas, citas y 6 métricas | Íntegramente inventado. No hay clientes. |
| Sección 04 | 69% · $500K–$2M · 7 of 13 | Sin fuente verificable. |
| Sección 04 · tarjeta 03 | Cuatro eventos regulatorios | Inventados. Llevan "PLACEHOLDER" a la vista. |
| Panel · escena 03 | $3,150 · $4,420 · $6,900 | Primas inventadas, sin aviso de que son ejemplo. |
| Panel · escenas 01 y 03 | Scores 72 y 86 | El Score Engine no existe todavía. |
| Footer | hello@arca.com | Dirección de relleno y dominio equivocado. |
| Cinta 1 | Harvey · CoCounsel · Lexis+ AI · Copilot · ChatGPT · Gemini | Marcas de terceros nombradas sin acuerdo. Revisar con abogado. |
| Hero | "Get a quote" | Botón visible que no hace nada. |

### Abierto por la reestructura

- **La landing sigue sin decir qué cubre**, y es deliberado: las 8 coberturas salieron con
  la cinta vieja y las sustituyen 8 escenarios de riesgo, que describen el problema, no la
  póliza. El detalle vive ahora en `/coverage`, a donde lleva el menú "Coverages" del
  navbar. Ese copy no está transcrito aquí: fuera de la landing, este documento solo
  recoge los avisos del embudo (sección 10) y las pantallas de la Capa 2 (sección 11).
- **La aclaración de Lloyd's salió de la landing** junto con "How we operate" (ver apéndice).

### Resuelto en revisiones anteriores

- La descripción SEO ya **no promete** "Get a quote in minutes".
- La página ya no mezcla tres audiencias: metadatos, badge, titular y subtítulo hablan
  todos a abogados. Accounting y consulting salieron del texto visible.
- Ya existe imagen al compartir el enlace.

---

## 12 · Webapp — cuentas reales (Supabase Auth, DN-13)

*Solo con `NEXT_PUBLIC_WEBAPP_ENABLED=true`. Las versiones simuladas de estas pantallas no cambian.*

*Desde el 2026-11-21 (DN-13 §19) el login, el alta y la invitación usan el marco del embudo: columna editorial con el orbe
y un titular a la izquierda (el h1), tarjeta a la derecha; en el móvil, apilados.*

### `/app/login`

| Elemento | Texto |
|---|---|
| Antetítulo · titular | Sign in · Welcome back. (tras pedir el código: Check your inbox.) |
| Ayuda | We'll email you a 6-digit code to verify it's you. There is no password. (tras pedir el código: Type the 6-digit code from the email to sign in.) |
| Tarjeta | Your work email · Enter your code |
| Botón | Send my code |
| Tras pedir el código (igual exista o no la cuenta) | If an account exists for {email}, we sent it a 6-digit code. It expires in 10 minutes. |
| Código nuevo | If an account exists for {email}, we sent it a new code. |
| Volver | Use a different email |

### Paso del código (login, alta e invitación)

| Elemento | Texto |
|---|---|
| Aviso (alta e invitación) | We sent a 6-digit code to {email}. It expires in 10 minutes. |
| Campo | Seis casillas, un grupo "Verification code" (lector: "Verification code, 6 digits"; cada casilla "Digit {n} of 6"). El sexto dígito verifica solo |
| Botones | Verify · Send a new code (durante 30 s: Send a new code in 0:{ss}) |
| Verificado | Verified. One moment… |
| Código incorrecto | That code is not valid or has expired. Check the latest email, or send a new code. |
| Código nuevo enviado / no enviado | We sent a new code to {email}. · We could not send a new code. Wait a minute and try again. |
| Nota del enlace y spam | Can't find it? Check your spam or junk folder: the email comes from no-reply@arcacover.com. It also has a link, which opens a page where you confirm the sign-in, on this device or another one. |

### `/app/signup` — el pre-checkout (DN-13 §19)

*Cinco pasos: You, Your firm, Plan, Verify email, Payment. El antetítulo de la izquierda es el del alta ("Save your results
and activate your account", o "Save your results to a new organization" con sesión); el titular cambia por paso. En los
modos simulados los cuatro primeros pasos son los mismos y el quinto lleva al checkout simulado.*

| Paso | Titular · ayuda (columna izquierda) | Tarjeta |
|---|---|---|
| 1 | Save your results in five short steps. · Tell us who you are and which firm the account is for. Nothing is charged before the last step. | Tell us about you: Work email (bloqueado; "From your scan. Your account uses this address.") · Full name · Your role (Managing partner, Partner, Office manager, Other) · Phone (optional) |
| 2 | The firm behind the results. · The legal name and the address go on your invoices, so the payment form does not ask for them again. | Your firm: Firm legal name · EIN (optional; "It goes on your invoices as the firm's tax ID.") · Street address · City · State · ZIP code · Attorneys at the firm (1, 2–5, 6–20, 21–50, 50+) · States where the firm practices (Find a state; "{n} selected: …") |
| 3 | Choose how you pay. · Monthly or annual, the same workspace. You can change plan or cancel from Billing. | Choose your plan: los planes de la API ("Billed every month" / "Billed once a year") · What {Firm} gets: The analysis you just ran, saved to {Firm}, with its action plan. · A workspace for your colleagues: invite them and choose what each one can do. · Manage or cancel the plan from Billing. · Billed in US dollars, by card. Nothing is charged before the payment step. |
| 4 | One step from your results. · We'll send a 6-digit code to verify it's you. No password, now or later. (tras pedirlo: Check your inbox. · Type the 6-digit code we just sent. It creates your account and saves your results.; simulado: Confirm the email of your scan to create your account.) | Verify your email: chip con la inicial, el email y "From your scan" · We'll send a 6-digit code to this address to verify it's you — no password. The code creates your account. · Send my code · Back. Con sesión: "You're signed in as {email}, so there is no code to type." · Continue to payment. Simulado: Confirm {email} to create your account and your organization. · Create my account |
| 5 | Last step: payment. · By card, through Stripe, in US dollars. Your account and your results are already saved. | Payment: Your account and {Firm} are ready. {plan}, {precio}. · Checkout de Stripe incrustado (simulado: Continue to payment) · Prefer to pay later? You can finish later from Billing. Go to Billing |
| Columna izquierda (ancha) | Secure payment by Stripe: your card goes to Stripe, never to ARCA. · No password: you sign in with a code sent to your email. | |

| Errores en línea | Texto |
|---|---|
| Nombre | Enter your full name. (más de 120: Use at most 120 characters.) |
| Rol | Choose your role. |
| Teléfono | Enter a phone number with 10 to 15 digits, or leave it empty. |
| Razón social | Enter the firm's legal name. |
| EIN | An EIN has 9 digits, like 12-3456789. You can leave it empty. |
| Dirección | Enter the street address. · Enter the city. · Choose the state. · Enter a 5-digit ZIP code, or ZIP+4. |
| Abogados | Choose how many attorneys work at the firm. |
| Estados | Choose at least one state where the firm practices. |
| Plan | Choose a plan. |
| El pago no abre | (mensaje de la API) · Try again. Ya pagado: Your organization's plan is already active. · Go to your workspace. Sin clave de Stripe: Payments are not available in this environment yet. Your account is saved: you can pay later from Billing. |

### `/app/billing/return` (nueva)

| Estado | Texto |
|---|---|
| Título | Your payment |
| Confirmando | Confirming your payment with Stripe… |
| Tras 30 s | Your payment is being confirmed. This can take a minute; Billing shows it as soon as it is done. · Check again · Back to Billing |
| Sin sesión de pago | There is no payment to confirm on this page. |
| De otra organización | We could not find this payment for {org}. If you paid, it shows in Billing within a few minutes. |

### `/app/billing` con cuentas reales

| Elemento | Texto |
|---|---|
| Tras "Pay" | Tarjeta "Payment" · {plan}, {precio}. · Checkout de Stripe incrustado · Choose another plan |

### `/app/invite/[token]`

| Elemento | Texto |
|---|---|
| Antetítulo · titular | Join an organization · You're invited. (tras pedir el código: Check your inbox.) |
| Ayuda | Your colleagues already use ARCA. Verify your email to join them: no password. |
| Primer paso | We'll send a 6-digit code to the address this invitation was sent to, to verify it's you. |
| Invitación con otra sesión | Signed in as {email}. The invitation is for one email: for any other, we email a 6-digit code to the invited address. |
| Botones | Send my code · Accept invitation (con sesión) |
| Código no enviado | We could not send the code. Wait a minute and try again. |
| Reclamo caducado o usado (410) | This link to save your results has expired or was already used. Run a new scan to save its results. |
| Invitación que ya no vale (410) | This invitation is no longer valid. Ask the person who invited you to send a new one. |
| Demasiados intentos (429) | Too many attempts. Try again in {n} minutes. |
| Auth caído (503) | Sign-in is temporarily unavailable. Please try again in a moment. |

### `/app/auth/confirm` (nueva)

| Elemento | Texto |
|---|---|
| Título | Confirm your sign-in |
| Ayuda | Press the button to finish signing in on this device. |
| Botón | Continue signing in |
| Enlace usado o caducado | This link has expired or was already used. Sign in again to get a new code. |
| Enlace incompleto | This sign-in link is incomplete. Open the latest email again, or sign in to get a new code. |
| Modos simulados | Sign-in links are not used in this environment. |
| Enlace | Sign in |

### `/app/settings` — "Your account" (todos los modos)

| Elemento | Texto |
|---|---|
| Tarjeta | Your account · Signed in as {email}. |
| Texto | Deleting your account signs you out and removes you from every organization you belong to. The organizations, their analyses and their activity stay with their other members. |
| Botón | Delete my account |
| Diálogo | Delete your account? · This cannot be undone. You will be signed out, and an organization would have to invite you again. |
| Botones del diálogo | Cancel · Yes, delete my account (tras un 503: Try again) |
| Único owner (409) | You are the only owner of an organization. Make another member an owner on the Members page, or request the organization's deletion, before deleting your account. |
| Cuenta cerrada a medias (503) | Your account is closed, but we could not finish removing your sign-in. Try again to finish. |
| Tarjeta Security (cambiado) | ARCA signs you in with a 6-digit code sent to your email. There is no password to set, change or leak. |

### Franja de `live-debug` con cuentas reales

> LIVE DEBUG · real scans · real accounts
