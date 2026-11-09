# Arca — Inventario de textos del sitio

Transcripción literal de la landing tal como está hoy en el código. Nada reescrito, nada corregido.
Los textos del sitio van en **inglés** porque ese es el mercado; las etiquetas y notas de este documento van en español.

- **Última actualización:** 9 noviembre 2026 (se añade la sección 10: el fallo de `/quote/scanning`, y el aviso de evidencia y el botón del PDF de `/score`)
- **Secciones:** 11 — las 10 de la landing, en orden de lectura, y una del embudo de cotización
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
del informe. El resto del embudo (formulario de `/quote`, mensajes de espera, tarjetas de
señales, cuestionario y resultados) sigue sin transcribir.*

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
> usually means the site blocked us…". Ya no es verdad: una web que no se deja leer por una
> causa definitiva (el `robots.txt` lo prohíbe, o responde 401/403 o una página de
> verificación) ya **no** hace fallar el scan. Termina con resultado y pasa a `/score` (ver
> abajo). `FAILED` queda para fallos nuestros o temporales, y por eso el texto pide
> reintentar y no sugiere usar otra dirección.

### `/score` — aviso de evidencia

*Un solo bloque, siempre visible, encima del nombre de la firma. Dice cuál de los tres casos
aplica. Nunca imprime flags ni códigos internos, y nunca nombra una decisión ni un precio.*

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
usar. En este caso la tarjeta "Refine your score" sube y queda justo debajo del score: el
cuestionario es la acción principal.*

> We could not read your firm's website, so everything we could not verify counts as unknown.
> That places your firm in the highest-risk group until you complete the assessment below.
> This is not a coverage decision.

La frase del medio solo sale si el tier que manda la API es `CRITICAL`. Con cualquier otro
tier dice:

> Complete the assessment below so your own answers count.

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
  recoge los avisos del embudo de la sección 10.
- **La aclaración de Lloyd's salió de la landing** junto con "How we operate" (ver apéndice).

### Resuelto en revisiones anteriores

- La descripción SEO ya **no promete** "Get a quote in minutes".
- La página ya no mezcla tres audiencias: metadatos, badge, titular y subtítulo hablan
  todos a abogados. Accounting y consulting salieron del texto visible.
- Ya existe imagen al compartir el enlace.
