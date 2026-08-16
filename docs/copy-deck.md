# Arca — Inventario de textos del sitio

Transcripción literal de la landing tal como está hoy en el código. Nada reescrito, nada corregido.
Los textos del sitio van en **inglés** porque ese es el mercado; las etiquetas y notas de este documento van en español.

- **Última actualización:** 14 agosto 2026 (tras aplicar el copy deck del CCO)
- **Secciones:** 11, en orden de lectura
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
- AI Professional Malpractice

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

## 03 · Cinta de coberturas

*Bajo el orbe, en movimiento continuo.*

**Micro-título**
- What we cover

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

*En pantalla van seguidas, sin separar los dos grupos.* 🟡 *Nombres sin validar con abogado ni carrier.*

---

## 04 · Products

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

## 05 · Panel del producto

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

## 06 · Your policy was written before AI

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

## 07 · Testimonials

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

## 08 · What we do

**Titular (H2)**

> What we do.

**Subtítulo**

> Insurance built around how your practice actually uses AI — not adapted from a generic tech policy.

| # | Pilar | Descripción |
|---|---|---|
| 01 | Plain-English coverage | Policies written in language attorneys actually use — no jargon, no fine print games. |
| 02 | Built for how AI fails in practice | Coverage designed around the real ways AI creates exposure — from a hallucinated citation to a disciplinary complaint. |
| 03 | A digital process, start to finish | From assessment to bound policy, everything happens online, at the speed your firm needs. |

---

## 09 · How we operate

*Bloque marino, sin titular propio. Es el texto regulatorio del sitio.* 🟡 **Pendiente de validar con abogado.**

### Managing General Agent (MGA)

> Arca underwrites, issues, and manages every policy on behalf of the insurance carrier that assumes the risk.

### Surplus lines

> Because AI risk is new and still evolving, our coverage is placed in the surplus lines market — built for risks the standard market hasn't caught up to yet.

### Building toward Lloyd's coverholder status

> We are working toward Lloyd's coverholder status — a goal we're pursuing, not a status we hold today.

> ⚠️ Este es el único punto donde el sitio dice explícitamente que lo de Lloyd's **todavía no está conseguido**. Esa frase es la que mantiene al sitio en regla; conviene no tocarla sin criterio legal.

---

## 10 · Pre-footer y footer

*Cierre sobre el vídeo de océano.*

**Titular de cierre**

> Don't navigate AI risk alone

**Subtítulo**

> Whether you're exploring coverage or ready to get a quote, we're here.

**Botón**
- Start a conversation 🟡 *(sin acción)*

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

## ↯ Qué no puede salir así

Todo lo marcado arriba, reunido. Es texto que hoy afirma cosas que no han ocurrido o que no están verificadas — en una aseguradora eso no es un detalle de redacción.

| Dónde | Qué dice | Problema |
|---|---|---|
| Testimonials | 3 firmas, citas y 6 métricas | Íntegramente inventado. No hay clientes. |
| Sección 06 | 69% · $500K–$2M · 7 of 13 | Sin fuente verificable. |
| Sección 06 · tarjeta 03 | Cuatro eventos regulatorios | Inventados. Llevan "PLACEHOLDER" a la vista. |
| Panel · escena 03 | $3,150 · $4,420 · $6,900 | Primas inventadas, sin aviso de que son ejemplo. |
| Panel · escenas 01 y 03 | Scores 72 y 86 | El Score Engine no existe todavía. |
| Footer | hello@arca.com | Dirección de relleno y dominio equivocado. |
| How we operate | MGA / surplus lines / Lloyd's | Redacción regulatoria sin validar con abogado. |
| Cinta de coberturas | Las 8 coberturas | Nombres sin validar con abogado ni carrier. |
| Hero y pre-footer | "Get a quote" · "Start a conversation" | Botones visibles que no hacen nada. |

### Resuelto en esta revisión

- La descripción SEO ya **no promete** "Get a quote in minutes".
- La página ya no mezcla tres audiencias: metadatos, badge, titular y subtítulo hablan
  todos a abogados. Accounting y consulting salieron del texto visible.
- Ya existe imagen al compartir el enlace.
