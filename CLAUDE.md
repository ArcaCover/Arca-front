# CLAUDE.md — Proyecto ARCA

> Este archivo es la **memoria del proyecto**. Claude Code lo lee automáticamente al
> inicio de cada sesión. Mantenlo actualizado: cuando tomemos una decisión firme
> (stack, arquitectura, marca, convención), se anota aquí.

---

## 1. Qué es Arca

**One-liner (estilo YC):** "ARCA es el Coalition de AI professional liability."

Arca es una **MGA (Managing General Agent) 100% digital** que vende seguro de
**malpractice profesional** específico para errores derivados del uso de inteligencia
artificial en firmas de servicios profesionales. Empezamos con abogados en Estados Unidos.

**Referencia principal: Coalition** — MGA de cyber insurance valorada en $5B. Replicamos
su enfoque: scoring automático de riesgo, distribución vía brokers, plataforma post-bind
tipo "Coalition Control" para active insurance. Coalition no le pregunta a las empresas
si tienen buena seguridad — las escanea automáticamente. Nosotros hacemos lo mismo para
AI governance en firmas de abogados.

### Modelo de negocio

- Opera como **MGA de surplus lines**: suscripción, distribución, emisión y
  administración de pólizas **en nombre de una aseguradora/reaseguradora ("carrier") que
  asume el riesgo en su balance**.
- Gana **comisión (25-30% de la prima)**, no primas de riesgo.
- Distribuye principalmente a través de **brokers de E&O** que ya tienen relación con
  firmas de abogados.
- También permite **compra directa (self-service)** para firmas que califican
  automáticamente.

**Aspiración regulatoria:** ser **coverholder de Lloyd's**. Esto es un **objetivo en
curso, NO un hecho logrado**. Nunca se presenta como conseguido en ningún texto público.

### Producto core

**ARCA AI Professional Malpractice** — seguro de **AI Professional Liability**
(Responsabilidad Civil Profesional por uso de Inteligencia Artificial). Cubre a
profesionales cuando la IA que usan para trabajar produce un error que daña a su cliente.

Es el **único producto en scope actual**. El seguro tipo SLA paramétrico (cobertura por
caída/degradación de servicios de IA de terceros, con trigger automático) se movió al
**roadmap de largo plazo (Fase 2-3)**.

### Coberturas del AI Professional Malpractice (8)

**Third-Party (cuando el cliente del asegurado sufre daño):**
- **AI Work Product Errors** — defensa legal + indemnización por trabajo defectuoso al
  confiar en output de IA (citas falsas, cálculos erróneos, análisis incorrecto)
- **AI Regulatory Sanctions** — multas y defensa ante sanciones disciplinarias del
  colegio profesional por mal uso de IA
- **AI Bias & Discrimination** — claims por outputs sesgados de IA en servicios
  profesionales
- **AI Privacy & Confidentiality Breach** — exposición de datos confidenciales de
  clientes a través de herramientas de IA

**First-Party (costos directos del asegurado):**
- **Error Remediation** — costos de identificar, corregir y re-emitir trabajo
  profesional afectado por errores de IA
- **AI Forensic Investigation** — auditoría forense para determinar alcance del impacto
- **Crisis Management** — PR, comunicación a clientes afectados, gestión de reputación
- **Regulatory Compliance Costs** — auditorías y evaluaciones obligatorias de compliance
  con regulaciones de IA

### Mercado y clientes objetivo

Producto **B2B**. Mercado: **Estados Unidos** (regulación estado por estado; el riesgo
de IA es novedoso, por eso surplus lines / mercado no admitido).

**ICP Primario:** firmas de abogados SMB en EE.UU. (2-50 abogados).
- **Estados prioritarios:** Florida, Texas, California, New York.
- **Áreas de práctica de mayor riesgo:** Criminal defense, Immigration, Personal Injury
  litigation.
- Prima estimada: USD 1,500–15,000/año.

**ICP Secundario:** firmas contables y consultoras SMB (5-100 empleados) — CPAs,
asesores tributarios, consultores de gestión que usan IA para cálculos, análisis,
reportes, reconciliaciones.

**Expansión geográfica (Fase 2):** US Hispanic market (Spanish-speaking firms), México,
Brasil.

### Tres capas del producto

1. **Sitio web institucional** — la cara al mercado: marketing y captación de leads.
2. **Plataforma web** — cotizador, motor de suscripción/reglas, emisión y gestión de
   pólizas, portal de cliente, backoffice, reporting hacia el carrier.
3. **App móvil** — cliente final: ver pólizas, reportar siniestros, notificaciones.

La plataforma web y la app móvil tendrán **las mismas funcionalidades**; son canales
distintos hacia la misma lógica.

---

## 2. Equipo

- **Juan José (CEO):** Construye el frontend con Claude Code (landing, UI del portal,
  cuestionario, reportes, dashboards). También gestión de CEO (contactos, brokers,
  Lloyd's Lab).
- **Jesús (Founder Engineer):** Construye el backend (scrapers, pipeline de Capa 1,
  lógica de scoring, API, base de datos, auth, pagos).
- **Insurance Advisor (por contratar):** Fractional, $2-5K/mes + equity. Valida scoring
  y pricing. Credibilidad frente a Lloyd's.

---

## 3. Estado del proyecto y decisiones confirmadas

- **Carrier:** aún **no** hay carrier con acuerdo. Consecuencia: **no se emiten pólizas
  reales** todavía. El foco actual es el sitio institucional y la plataforma de scoring.
- **Producto core definido:** AI Professional Malpractice. Score Engine diseñado (3
  capas). Pendiente de implementación técnica.
- **Principio de arquitectura:** **API-first**. Toda la lógica de negocio vive en un
  backend/API central; web y móvil son capas delgadas que la consumen. Nunca duplicar
  la lógica de negocio en el frontend.

### Stack tecnológico confirmado

- **Lenguaje único:** **TypeScript** (web, backend y móvil), modo estricto. Si el
  backend de Jesús usa otro lenguaje, eso se decide explícitamente porque rompe la
  premisa de código compartido. **Pendiente de confirmar con Jesús.**
- **Web:** **Next.js** (App Router). Renderizado en servidor para buen **SEO**.
- **Estilos:** **Tailwind CSS** (v4; tokens declarados en `globals.css`).
- **Tipografías (gratuitas, vía `next/font`):** **Space Grotesk** (títulos) y **Mulish**
  (textos). No usar fuentes de pago ni cargar Google Fonts con `<link>`.
- **Iconos:** `lucide-react` (única librería de UI permitida en la landing).
- **Componentes de UI para la plataforma (portal/dashboard):** `shadcn/ui` aprobado
  como candidato. No aplica a la landing existente (ya construida con componentes
  propios).
- **Datos / auth / almacenamiento:** **Supabase** (Postgres + Auth con magic links).
  **Aún NO conectado**: el cliente está cableado a variables de entorno pero dormido.
- **Auth:** magic links vía Supabase Auth. Sin contraseña nunca.
- **Pagos:** Stripe (test mode para MVP). **No conectado aún.**
- **App móvil (fase posterior):** **Expo / React Native**, reutilizando lógica y
  validaciones en TypeScript.
- **Hosting frontend:** **Vercel**.
- **Repositorio:** organización `ArcaCover` en GitHub. Frontend: `Arca-front`
  (`https://github.com/ArcaCover/Arca-front`). Backend: repo de Jesús (pendiente).
  Claude Code corre en la nube, ya no en local.
- **Dominio:** **arcacover.com** (confirmado). Vive como valor por defecto en
  `app/layout.tsx` para que producción no dependa de configurar nada;
  `NEXT_PUBLIC_SITE_URL` existe solo para apuntar previews o staging a sí mismos.
- **Hosting backend:** Railway o Render (decisión de Jesús, pendiente).
- **Costo de infra MVP:** ~$0-55/mes.
- **Convención:** validaciones y tipos se escriben **una sola vez** y se comparten; no
  reescribir la misma regla en dos lugares. Las listas de contenido compartido
  (p. ej. industrias) viven en **un único archivo** (`lib/industries.ts`) para que no se
  desincronicen entre componentes.

### Convenciones técnicas (aprendizajes de sesiones anteriores)

- **Tailwind v4:** `scale-*` escribe la propiedad CSS `scale`, que se multiplica con
  `transform`. Si una animación escribe `transform` por JS, el valor inicial va por
  `style`, nunca con `scale-x-0`. Esto dejó una barra de progreso invisible.
- **Animaciones por frame:** se escriben directo al nodo DOM por `ref`, nunca a estado
  de React (evita re-render a 60fps).
- **`lib/useInView`** es el hook de la casa para entrada al hacer scroll y para pausar
  bucles fuera de pantalla (`once: false`). No escribir observers a mano.
- **Datos compartidos:** `lib/coverages.ts` define los grupos y deriva la lista plana
  con `flatMap`, para que cinta y secciones no se desincronicen.
- **Paneles de tamaño fijo:** se maquetan a medida fija y se escalan a su columna con
  `ResizeObserver`, así el diseño aprobado se respeta a cualquier ancho.
- **Colores fuera de paleta:** si el diseño trae un color que no está en la paleta
  (p. ej. un verde), sustituirlo por el token más cercano (cielo, oro, etc.) y avisar.
  No ampliar la paleta sin decisión del fundador.
- **El compilador puede descartar CSS válido en silencio.** Una capa de degradado
  con `var()` y una parada en `0` sin unidad desapareció de `background` sin dar
  error, y el efecto simplemente no ocurría. Se resolvió con `mask-image`. Moraleja:
  cuando un estilo "no hace nada", **comprobar en el navegador que la regla llegó**
  (contar las capas con `getComputedStyle`) antes de reescribir el diseño.
- **Movimiento que no se ve:** una capa animada más grande que su contenedor lo
  llena de forma uniforme, y desplazar un relleno uniforme no cambia la imagen. Para
  que un fondo se perciba en movimiento, lo que debe cruzar el encuadre es el
  **borde** de la forma, no su centro. Pasó dos veces en la tarjeta de testimonios.
- **Bucles sin costura:** una animación que va y vuelve (`alternate`) se detiene en
  cada giro y se lee como imagen fija; un recorrido finito tiene que reiniciarse. Una
  **rotación de 360°** empieza donde termina, así que nunca salta. Con varias capas
  de periodos sin factores comunes, el patrón tarda horas en repetirse.
- **Generación de imágenes:** `sharp` está disponible como dependencia de Next y sirve
  para rasterizar SVG a PNG (así se generó `public/og.png`). No hace falta instalar
  nada ni usar herramientas externas.

### Idioma — dos niveles (regla estricta)

1. **Texto visible del sitio:** en **INGLÉS** (mercado EE. UU.).
2. **Todo el código en INGLÉS**: variables, funciones, componentes, archivos, tablas,
   endpoints, comentarios y mensajes de commit. Sin excepción. El fundador escribe los
   prompts en español, pero **nada se traduce al español en el código**.

---

## 4. Decisiones AÚN NO tomadas (no las inventes)

Hasta que el fundador las confirme explícitamente, **no asumas**:

- Lenguaje del backend de Jesús (TypeScript vs Python). Recomendación del CTO:
  TypeScript para mantener lenguaje único.
- Modelo de datos detallado (entidades, tablas, relaciones). El modelo de
  organizaciones (§6.4) está diseñado a nivel de negocio, no de schema.
- Proveedores externos adicionales (email transaccional, firma electrónica).
- Librerías concretas de formularios, validación, charts o generación de PDF para la
  plataforma.
- Implementación técnica del Score Engine (las 3 capas están diseñadas a nivel de
  negocio, no de código).
- Diseño visual del flujo de cotización y de los dashboards.

---

## 5. Identidad de marca

### Concepto (el corazón de Arca)

El nombre "Arca" trae **tres ideas** que deben respirarse en diseño y tono:

1. **REFUGIO / PROTECCIÓN** — un arca resguarda lo valioso y te lleva a salvo a través
   de la tormenta (los riesgos de la IA).
2. **UN OJO ATENTO** — Arca vigila lo que tú no alcanzas a ver. El orbe del hero es
   visualmente ese "ojo". Protección, nunca vigilancia intrusiva.
3. **INCLUSIÓN** — inspirado en el arca de Noé, **no en clave religiosa** sino en que
   "caben todos": nadie queda fuera por ser nuevo, distinto o no encajar en los moldes
   del seguro tradicional (la actitud de Nubank aplicada al sistema asegurador).
   **Matiz obligatorio:** una aseguradora SÍ evalúa riesgos, así que **nunca prometer
   cobertura garantizada para todos**. La inclusión es de espíritu y acceso, no promesa
   de aceptación.

**Dirección de diseño:** claro, calmado y confiable (comunicación simple estilo
Lemonade: lenguaje llano, mucho aire, sin letra chica), con acabado moderno y algo
"tech". Tono B2B: cercano pero serio. Layouts **editoriales** (no todo centrado y del
mismo tamaño), esquinas muy redondeadas, botones tipo píldora, CTA dorado con flecha
dentro de un **círculo blanco**. Nunca copiar a Lemonade ni a ninguna marca real.

**Fondo de la página (decisión revisada):** ya **no** se alternan secciones
blanco/bruma. El hero y todo el cuerpo comparten **un único lienzo iluminado**: base
casi blanca (`--color-canvas`) con varios halos muy amplios de cielo y bruma
repartidos a lo largo de toda su altura. La idea es la del hero — no es un color, es
blanco con una fuente de luz encima — y el ritmo lo dan ahora los **bloques marino**
y las tarjetas que flotan sobre el lienzo. Se probó un gris plano antes y se
descartó: un gris de base ensucia cualquier luz que se le ponga encima.

### Paleta de color y roles (usar exactamente estos hex, siempre vía tokens)

- **Marino `#1C2C5B`** — ancla: títulos, textos, secciones oscuras, navbar.
- **Cielo `#6CABDD`** — calma: fondos suaves, etiquetas, detalles, el orbe.
- **Oro `#FFC659`** — acento cálido, SOLO para CTAs y algún dato destacado. El texto
  sobre oro va en **marino**, nunca en blanco.
- **Oro oscuro `#D4A12A`** — texto dorado sobre claro, estados hover, eyebrows sobre
  fondo claro.
- **Blanco `#FFFFFF`** — lienzo principal.
- **Bruma `#E4F4F7`** — tarjetas y etiquetas (ya no fondos de sección).
- **Rojo `#EC3325`** — RESERVADO solo para alertas y errores.

**Token derivado (no es un color nuevo de marca):**
- **`--color-canvas`** = `color-mix(in srgb, var(--color-marino) 2%, white)` ≈ `#FAFAFB`.
  Lienzo del hero y de todo el cuerpo. Se deja **muy cerca del blanco a propósito**:
  los halos encima son los que dan profundidad, y un gris más denso debajo solo los
  enturbia.

**Convención de tokens:** colores y fuentes se definen **una sola vez** como tokens y se
usan por nombre. **Nunca escribir un hex suelto en un componente.** Los tonos
intermedios que no existan en la paleta se **derivan de los tokens con `color-mix`**
(como se hizo con los degradados del orbe).

**Excepción retirada:** existía una excepción para las constantes GLSL del shader WebGL
del océano. Ese shader **ya no está en el código** (lo sustituyó el vídeo), así que la
excepción desapareció con él. Comprobado: los **únicos hex de `app/` y `components/`
son los seis tokens** de `globals.css`.

**Única excepción viva:** `public/brand/og-source.svg` sí lleva los hex escritos. Es un
asset que se rasteriza fuera del navegador (con `sharp`), donde no existen las
variables CSS, así que los valores van resueltos a mano. Si cambia la paleta, hay que
actualizarlo también.

### Assets de marca

- **Logo:** el wordmark oficial vive en `components/brand/ArcaWordmark.tsx` (SVG con
  `currentColor`). Respaldos estáticos en `public/brand/`. **Ya no se usa texto plano
  como logo.** El wordmark dice "Arca" con A mayúscula.
- **Regla de exportación de SVG:** las letras deben venir como compound paths —
  contorno y contraforma en un mismo trazado. Si la contraforma va como `<path>` aparte,
  `fill-rule="evenodd"` no cala y las letras salen macizas. Pasó con las dos versiones
  que llegaron; hubo que fusionarlas a mano.
- **Favicon:** juego completo en `public/` (`favicon.ico` con 6 tamaños, `icon.svg`,
  `icon-16/32.png`, `apple-touch-icon.png`), declarado en `metadata.icons` de
  `app/layout.tsx`. Se eligió esa vía en lugar de los archivos de convención de Next
  para no duplicar tags.
- **Encuadre:** los assets de marca deben venir centrados y llenando su lienzo. El
  favicon llegaba con 33% de vacío abajo y solo 57% de alto ocupado; se recentró al 90%.
- **Imagen para compartir (Open Graph):** `public/og.png`, 1200×630, ~155 KB. Está
  **dibujada con código** (orbe del hero con su degradado y anillos sobre fondo
  marino + wordmark real + titular de Products). El SVG fuente vive en
  `public/brand/og-source.svg`: si cambia el copy, se reedita ese archivo y se
  re-rasteriza con `sharp`, no se retoca el PNG.

---

## 6. Estrategia de negocio y mercado

### 6.1 Posicionamiento y diferenciación

**Elevator pitch:** "ARCA es el seguro de malpractice para la era de la inteligencia
artificial."

**Analogía de posición:** Armilla asegura al que FABRICA el cuchillo de IA. Testudo
asegura al que lo VENDE. ARCA asegura al CHEF que lo usa para cocinar y sin saberlo
sirve un plato contaminado.

**Competidores directos — NO nombrar en textos comerciales (ver §7):**

| Competidor | A quién asegura | Espacio que no cubren |
|---|---|---|
| **Coalition** | Cyber insurance con scoring automático | No cubre malpractice por IA |
| **Armilla AI** (Lloyd's coverholder, Toronto) | Empresas que CONSTRUYEN IA | No cubre profesionales que USAN IA |
| **Testudo** (Lloyd's Lab alumni) | Mid-market que DESPLIEGA GenAI | No enfocado en professional services SMB |
| **HSB / Munich Re** | Paramétrico para AI downtime | Cubre interrupción, no errores profesionales |
| **Carriers tradicionales de E&O** | Professional liability estándar | No tienen scoring de AI governance |

**Posición de ARCA:** profesionales que USAN IA para servir a clientes + scoring engine
de AI governance. Nadie está ahí.

### 6.2 Ruta regulatoria

- **Hoy:** agente de seguros. No hay binding authority, no suscribimos, no emitimos.
- **Prioridad #1:** entrar a **Lloyd's Lab** (accelerator de Lloyd's of London).
  **Target: Cohort 18, apertura estimada diciembre 2026.**
- **Ruta:** Agente → Lloyd's Lab → Coverholder con syndicate sponsor → MGA con binding
  authority → eventualmente Carrier.
- **Lo que mostramos a Lloyd's Lab:** Score Engine funcionando como herramienta de
  suscripción + tesis de mercado (gap de professional liability por IA) + 50+ scorecards
  completos + feedback de brokers.
- **Competidores que pasaron por Lloyd's Lab:** Armilla AI (Chaucer como sponsor),
  Testudo (Cohort 14, Apollo como sponsor). Cubren segmentos distintos al nuestro.

### 6.3 AI Governance Score Engine (activo central del negocio)

El Score Engine es el corazón de ARCA. Evalúa qué tan expuesta está una firma
profesional al riesgo de malpractice por IA. Es lo que nos diferencia y genera el moat
competitivo.

#### Arquitectura de tres capas

**CAPA 1 — AUTOPILOT (Señales automáticas, 0 fricción)**
- El broker o cliente ingresa solo email + dominio.
- ARCA escanea automáticamente en <60 segundos:
  - Website de la firma (AI policy, menciones de IA, tamaño, practice areas, blog)
  - Tech stack (BuiltWith/Wappalyzer: plataforma legal, email provider, DMARC)
  - Datos regulatorios (bar standing, sanciones disciplinarias, regulaciones de IA por
    estado)
  - Señales del mercado laboral (job postings con IA)
- Genera un **Pre-Score (0-100)** con nivel de confianza (ALTA/MEDIA/BAJA).
- Output: Pre-Score + señales detectadas + Quick Scan Report.

**CAPA 2 — DEEP SCAN (Cuestionario inteligente, ~5 min)**
- **8-12 preguntas adaptativas** (de un banco de 20) basadas en lo que Capa 1 ya
  detectó. Si detectamos AI policy en el web, NO preguntamos "¿tienen policy?" —
  preguntamos "¿con qué frecuencia la actualizan?"
- 6 dominios con pesos:

| Dominio | Peso | Qué evalúa |
|---|---|---|
| D1. AI Governance & Policy | 25% | Política escrita, ownership, herramientas aprobadas |
| D2. AI Tool Environment | 20% | Enterprise vs consumer, casos de uso, dependencia |
| D3. Human Oversight & Review | 20% | Proceso de revisión, seniority, checklist, disclosure |
| D4. Data Protection & Confidentiality | 15% | Datos de clientes en IA, controles, consentimiento |
| D5. Training & Competency | 10% | Programa de training, awareness de limitaciones |
| D6. Incident Preparedness | 10% | Plan de respuesta, monitoreo, historial de incidentes |

- Output: Composite Score + scores por dominio + tier + pricing + Risk Report.

**CAPA 3 — LIVING SCORE (Monitoreo continuo post-bind)**
- Dashboard tipo Coalition Control donde el asegurado vive todo el año.
- Re-scans mensuales de Capa 1.
- Alertas proactivas (nuevos casos de malpractice por IA, cambios regulatorios).
- Score dinámico que cambia con el riesgo real.
- **Para diciembre 2026: solo mockup funcional.** La Capa 3 real es post-Lloyd's Lab.

#### Score visible vs. multiplicadores internos

**UN solo score visible para el cliente:** AI Governance Score (0-100). Es lo que puede
mejorar. Es su "hero metric."

**Multiplicadores internos (no visibles, afectan pricing):**

Practice Area Risk Multiplier:
- Criminal defense: 2.0x
- Immigration: 1.8x
- Personal Injury litigation: 1.6x
- Family law: 1.3x
- Commercial litigation: 1.2x
- Employment law: 1.15x
- Corporate/M&A: 1.0x (baseline)
- Real estate: 0.85x
- Tax/regulatory: 0.75x

Jurisdiction Factor: 0.85 (poco litigioso) a 1.25 (FL, CA, TX, NY).
Size Factor: 0.90 (solo practitioner) a 1.30 (31-50 abogados).

#### Tiers

| Score | Tier | Nombre | Decisión |
|---|---|---|---|
| 85-100 | 1 | **FORTRESS** | AUTO_BIND — mejores tarifas, quote instantáneo |
| 70-84 | 2 | **FORTIFIED** | AUTO_BIND — tarifas estándar, quote instantáneo |
| 50-69 | 3 | **GUARDED** | REFERRAL — tarifas cargadas, quote en 48h |
| 30-49 | 4 | **EXPOSED** | REFERRAL_SENIOR — tarifas altas + condiciones, quote en 5 días |
| 0-29 | 5 | **CRITICAL** | DECLINE — plan de mejora + re-assessment en 90 días |

#### Benchmark

El cliente ve: "Tu firma está en el percentil X comparado con firmas de [su área de
práctica] en [su estado]." Se vuelve más preciso con cada firma que escaneamos.

#### Pre-bind contingencies (estilo Coalition)

Si score es bajo, NO declinamos sin más. Damos un **"path to insurability"**: qué
mejorar, cuántos puntos ganaría, y cuándo puede re-evaluar. Convierte un "no" en un
"todavía no."

#### Action plan gamificado

Cada mejora muestra puntos (+10 pts) e impacto en prima (-12%). Estilo Coalition
Control.

#### Fórmula de pricing

```
Prima Anual = Base Rate ($420) × Número de abogados × Governance Factor × Practice Multiplier × Jurisdiction Factor × Size Factor
```

3 opciones de límite siempre:
- **Essential:** $50K per claim / $100K aggregate (factor 0.60)
- **Professional:** $250K per claim / $500K aggregate (factor 1.00)
- **Complete:** $1M per claim / $2M aggregate (factor 1.85)

**No implementar pricing hasta que el fundador lo indique.**

Documento de diseño detallado: ARCA_SCORE_ENGINE_BLUEPRINT_v2.md.

### 6.4 Tres flujos de adquisición

**Flujo A — Directo (self-service)**
1. Abogado llega a arcacover.com.
2. Pone email + dominio (estilo Lemonade: sin contraseña, sin registro).
3. Ve Pre-Score en 30-60 segundos.
4. Completa cuestionario (~5 min).
5. Ve score completo + pricing.
6. Si AUTO_BIND → puede comprar directo con Stripe.
7. ARCA se queda 100% de la comisión.

**Flujo B — Directo → Broker**
1-5: Igual que Flujo A.
6. Si REFERRAL → no puede comprar directo.
7. Lo conectamos con un broker certificado de ARCA.
8. Broker recibe lead calificado con score + reporte.
9. Broker recibe comisión reducida (ARCA generó el lead).

**Flujo C — Broker invita (canal principal)**
1. Broker entra a su dashboard.
2. Click "+ Nuevo Lead" → nombre + dominio + email del cliente.
3. Sistema corre Capa 1 automáticamente.
4. Broker puede: compartir por link (con tracking), enviar por email, descargar PDF
   con su branding.
5. Abogado abre el link → ve Pre-Score → completa assessment.
6. Todo queda vinculado al broker que lo invitó.
7. Broker cierra la venta → comisión completa.

#### Registro estilo Lemonade

- Primer touchpoint: solo email + dominio. Nada más. Sin contraseña.
- El email se guarda INMEDIATAMENTE como lead (aunque cierre la página).
- La "cuenta" formal solo se crea al comprar o al ser invitado a una organización.
- Usamos magic links (Supabase Auth) — sin contraseña nunca.

### 6.5 Modelo de organizaciones

La firma es una **organización**. Múltiples personas pueden tener acceso con diferentes
roles.

Ejemplo: "Miami Legal Services" (organización)
- John Smith (Managing Partner) → compró la póliza → role: "owner"
- Sarah Chen (Director of Operations) → monitorea score → role: "admin"
- Mike Johnson (IT Manager) → implementa mejoras → role: "member"

**Roles y permisos:**
- **owner:** Control total (billing, cancelar póliza, invitar/remover miembros)
- **admin:** Ver todo, invitar miembros, re-hacer assessments (no billing)
- **member:** Ver score, alertas, action plan, marcar acciones completadas
- **viewer:** Solo lectura

La organización se crea automáticamente al comprar (Flujo A) o cuando el broker emite
la póliza (Flujo C).

**Nota:** este modelo está diseñado a nivel de negocio. El schema de base de datos es
una decisión pendiente (ver §4).

### 6.6 Onboarding de brokers

Los brokers **NO se auto-registran**. Es un proceso manual:
1. Broker ve página "Partners/Producers" en arcacover.com → llena formulario de solicitud.
2. CEO hace discovery call y evalúa.
3. Si aprobado, CEO crea la cuenta desde el panel admin.
4. Broker recibe magic link de invitación → accede a su dashboard.
5. CEO hace demo del producto.

### 6.7 Catalizador de mercado

En enero 2026 Verisk/ISO publicó una exclusión de IA generativa (Form CG 40 47).
Dato reportado: afecta al 82% de las pólizas de P&C globales. **⚠ VERIFICAR fuente y
cifra exacta antes de usar en cualquier texto público.** Las pólizas de professional
liability tradicionales están en zona gris sobre si cubren errores causados por IA.
ARCA llena ese hueco.

### 6.8 Documentos de referencia

- **ARCA_SCORE_ENGINE_BLUEPRINT_v2.md** — Diseño completo del scoring engine con
  fórmulas, pesos, y preguntas.
- **ARCA_DEVELOPER_HANDOFF.html/.md** — Especificación técnica para Jesús con
  endpoints, modelo de datos, y JSON de request/response.
- **ARCA_CEO_PLAYBOOK.html** — Plan de ejecución semana a semana del CEO.
- **ARCA_OnePager.pdf** — one-pager con producto, mercado, competencia, roadmap.
- **ARCA_Guia_JuanJose.pdf** — versión simplificada con analogías.
- **ARCA_Scorecard_Design.pdf** — preguntas completas, puntajes, fórmula de pricing
  original, rate multipliers, controles anti-fraude, flujo paso a paso.

---

## 7. Reglas de honestidad y contenido (obligatorias — es una aseguradora)

- **Nunca** inventar testimonios, ratings, número de clientes, sellos ni certificaciones
  en contenido que vaya a producción. En modo diseño se pueden usar placeholders
  **claramente ficticios**, siempre marcados con `// TODO: replace before launch`.
- **Nunca** presentar el estatus de **coverholder de Lloyd's** como logrado.
- **Nunca** afirmar cifras sin fuente verificable. Las estadísticas actuales del sitio
  son **provisionales y pendientes de verificar** con el CCO.
- **Nunca** usar imágenes, videos, fuentes de pago ni assets tomados de otras empresas o
  sitios, aunque estén accesibles públicamente. Todo original o de licencia libre para
  uso comercial. Los visuales (orbe, océano, arcos) se construyen **con código**.
- **No** prometer inmediatez ni cobertura que hoy no existe (no hay carrier ni cotizador).
- **No** nombrar competidores en textos comerciales (publicidad comparativa).
- No mezclar con **Otonomi** (otra empresa del fundador, sin relación con Arca).

**Excepción consciente (pre-lanzamiento):** el panel del océano en la sección Products
muestra precios ilustrativos ($3,150 / $4,420 / $6,900) y un flujo de "Bind in minutes"
como demostración del producto futuro. Son placeholders de diseño, no promesas reales.
Hay un `// TODO: replace placeholder premiums with real rates before launch` en el
código. **Antes de ir live, se debe o etiquetar con un disclaimer visible ("Illustrative
example — actual rates vary") o retirar las cifras.** Esta decisión queda pendiente.

---

## 8. Reglas de datos sensibles y seguridad

- **Nunca** escribir secretos (claves, tokens, contraseñas) en el código. Usar
  **variables de entorno**; `.env.local` ignorado por git y `.env.example` sin valores.
- **Nunca** exponer datos de asegurados en logs, mensajes de error o URLs.
- Diseñar pensando en **trazabilidad y auditoría**: quién hizo qué, cuándo y por qué.
- Si una tarea implica manejar datos personales de forma nueva, **avisarlo**: puede
  tener implicaciones regulatorias a validar con un especialista.

*(No somos asesores legales; son buenas prácticas, no asesoría legal.)*

---

## 9. Estado de la landing institucional

**Estructura de fondo:** `app/page.tsx` envuelve las cinco secciones del cuerpo
(cinta de herramientas → Testimonials) en un `div.page-canvas`. Ese contenedor lleva el
lienzo y los halos; las secciones son **transparentes**, para que la luz sea continua y
no haya costura entre ellas. El hero comparte el mismo token de base y los halos entran
con una máscara en los primeros 420px, si no el corte del primer halo dibujaba una
línea justo donde termina el hero.

**Orden narrativo (decisión del CCO, agosto 2026):** problema → riesgos concretos →
solución → prueba social → CTA. El visitante ve primero las herramientas que ya usa,
después se entera de que su póliza no las cubre, después los escenarios que eso deja
abiertos, y solo entonces qué vendemos.

**Secciones actuales, en orden:**

1. **Navbar** — transformable con scroll: arriba transparente con el **wordmark SVG**
   grande y centrado flotando sobre el hero y solo "My account" a la derecha; al bajar
   se fija con fondo blanco, el wordmark se reduce y aparece el botón dorado "Get a
   quote" empujando "My account" a su izquierda. Enlaces pegados a los **bordes reales**
   de la ventana (no al ancho del hero). Menús: "Coverages" (una sola opción: AI
   Professional Malpractice), "Industries" (**solo "Legal"**, desde `lib/industries.ts`)
   y "Partners" (Producers, Platforms). Accesibles por teclado; en móvil, hamburguesa
   con logo centrado.
2. **Hero** — dos columnas. Izquierda: badge **rotativo** de **3 frases, todas legales**
   ("Built for independent lawyers" → "Built for law firms" → "Built for legal
   partnerships", en ese orden fijo, ~3s cada una, en bucle), título, subtítulo y CTA
   dorado. Derecha: **orbe interactivo** que se inclina hacia el cursor (halo y anillos
   lo siguen más lento; flotación automática en táctil; estático con reduced-motion).
3. **Cinta 1 — herramientas** (`components/landing/ToolsBelt.tsx`) — micro-título
   "Protecting firms that use" y seis nombres (Harvey · CoCounsel · Lexis+ AI ·
   Microsoft Copilot · ChatGPT · Google Gemini) en `opacity-60`, como lista de
   integraciones. **No dice "Trusted by"**: no son clientes ni socios.
4. **"Your policy was written before AI"** — stats con count-up + tres cards animadas
   (documento que falla, barra de sublímite con tooltip, feed regulatorio).
5. **Cinta 2 — riesgos** (`components/landing/RisksBelt.tsx`) — micro-título "The risks
   your current policy ignores" y 8 escenarios en segunda persona, a plena opacidad.
   Hace de puente entre el problema y la solución.
6. **Products** — recorrido interactivo del producto:
   - Sobre el lienzo de la página, tarjeta blanca de ~1080px, esquinas de ~40px.
   - **Encabezado fuera de la tarjeta (centrado):** headline "Coverage for the mistakes
     AI makes in your name." + subtítulo "One policy built for the risks your current
     coverage ignores."
   - **Eyebrow** `FROM ASSESSMENT TO COVERAGE` en oro oscuro arriba de los pasos.
   - **Izquierda:** 4 features con auto-avance de ~5.5s y barra de progreso dorada. Clic
     salta y reinicia. Features: Know your risk in minutes · See where you stand · Get
     real numbers · Bind in minutes.
   - **Derecha:** panel de ~560×420 con vídeo de océano (`public/videos/ocean.mp4`) y 4
     escenas (scan → cuestionario → gauge y cotizaciones → timeline de emisión).
   - **Nota:** las 8 coberturas ya no se muestran aquí ni en ninguna otra parte del
     sitio. Al retirar la cinta vieja, `lib/coverages.ts` dejó de estar en la página:
     su único consumidor hoy es `landing/CoverageBelt.tsx`, que tampoco se renderiza.
     `COVERAGE_GROUPS` sigue sin consumir. Todo se conserva a propósito.
7. **Testimonials** — **una sola tarjeta grande** tipo case study (no carrusel de
   tarjetas pequeñas): firma, titular, cita, autor y dos métricas en oro a la
   izquierda; bloque de iniciales a la derecha; controles `‹ ›` con fundido de 300ms
   para alternar los 3 testimonios. Datos en `lib/mock/testimonials.ts`, **solo firmas
   legales y todas ficticias**. El fondo es **seda generada con código** (`.silk`):
   cuatro manchas difuminadas orbitando sobre un degradado de la paleta, con periodos
   19/27/23/15s. Antes era una foto de stock; se retiró (ver "Hechos").
8. **Pre-footer océano** — **vídeo** (ya no shader WebGL), "Don't navigate AI risk
   alone", CTA "Start a conversation" (sin acción todavía).
9. **Footer** — Contact, Resources, Company (Partners, Blog, Careers), Follow us.

**Retiradas de la landing, intactas en el código:** `ValuePillars.tsx` ("What we do"),
`HowWeOperate.tsx` ("How we operate") y `landing/CoverageBelt.tsx` (la cinta "What we
cover"). Los tres imports siguen en `app/page.tsx` **comentados**, con la nota de por qué.
Destino previsto: página Partners o About, y `CoverageBelt` para donde vuelva a hacer
falta enumerar coberturas. **No borrarlas.** `CoverageBelt` se extrajo de dentro del hero
tal cual estaba, así que conserva el `pt-24` que servía para librar los anillos del orbe y
**no** pausa fuera de pantalla como las cintas nuevas: hay que ajustar las dos cosas si se
revive. Ojo con una consecuencia: "How we operate" era el único sitio donde la
landing aclaraba que el estatus de coverholder de Lloyd's **no está conseguido**, así que
esa aclaración hoy no está en la página (§7 sigue prohibiendo afirmarlo).

**Patrón de encabezado:** las secciones con `<h2>` (Products, "Your policy…",
Testimonials, pre-footer) llevan **titular + subtítulo** con el mismo tratamiento (18px,
marino al 80%, centrado, 600px de ancho). Si se añade una sección nueva, seguir ese
patrón. Las dos cintas son la excepción: llevan solo micro-título (17px, semibold,
marino al 40%), sin subtítulo.

**Mecánica de las cintas:** las dos usan el keyframe `animate-marquee` de `globals.css`
(60s lineales, `translateX(-50%)`) y un fundido `mask-image` **escrito inline** — desde
la hoja de estilos el compilador lo descarta. Se pausan fuera de pantalla con
`useInView({ once: false })` y heredan la regla de `prefers-reduced-motion` que ya existía
para `.animate-marquee`. Como el keyframe viaja `-50%`, la lista se repite un número
**par** de veces: RisksBelt 2, ToolsBelt 4 (seis nombres cortos no llenan la banda, y con
2 copias se veía el hueco al cerrar el bucle). Solo la primera pasada se lee: las
repeticiones van con `aria-hidden`.

**Espacio bajo el hero:** el orbe exterior **sobresale del grid** y la sección recorta
overflow, así que el `lg:pb-12` del grid del hero es lo que impide que el anillo se corte
(a `lg:pb-0` perdía el arco inferior). Está deliberadamente justo para que la cinta 1
rompa el pliegue: en 1440×900 el hero mide 736px y la cinta asoma 164px.

**Textos clave actuales** (el inventario completo del copy está en la §9.1):
- Título hero: "Insurance for lawyers who rely on AI."
- Subtítulo hero: "AI moves faster than the risks it creates. Arca is the eye that
  watches over your practice, from AI-drafted errors to automated decisions, so you
  stay protected."
- Metadatos: title "Arca: AI Liability Insurance for the Legal Industry" — con **dos
  puntos**, no guion, y dirigido a la industria legal.

**Audiencia — regla:** el sitio habla a **abogados** ("lawyers", "your practice"), no a
"businesses" ni a "firms" a secas. "Lawyers" cubre las tres variantes del badge
(independiente, firma, sociedad); "law firms" dejaba fuera al abogado independiente.
Accounting y consulting **salieron de todo el texto visible** aunque siguen en el ICP
secundario de la §1.

**Coberturas (definidas por el CEO y Co-CEO; pendiente validación final con
abogado/carrier):**
AI Work Product Errors · AI Regulatory Sanctions · AI Bias & Discrimination ·
AI Privacy & Confidentiality Breach · Error Remediation · AI Forensic Investigation ·
Crisis Management · Regulatory Compliance Costs.
**Producto único:** AI Professional Malpractice (las 8 coberturas).
**⚠ Hoy no aparecen en el sitio.** Salieron con la cinta vieja y las cintas nuevas hablan
de herramientas y de riesgos, no de coberturas. El menú "Coverages" del navbar solo dice
"AI Professional Malpractice". Queda **abierto** dónde vuelve a verse el detalle: la
landing describe el problema pero ya no enumera qué cubre la póliza.

### 9.1 Inventario completo del copy

La transcripción literal de **todo** el texto visible, sección por sección y en orden
de lectura, incluido lo que no se ve de entrada (las 5 preguntas del cuestionario, las
fuentes del escaneo, el feed regulatorio, el timeline de emisión), vive en
`docs/copy-deck.md`. Lleva marcado qué es ficticio y qué está sin verificar. **Al
cambiar copy, actualizar también ese archivo** o vuelve a quedar desfasado.

### Pendientes marcados en el código (TODO)

Lista verificada contra los `TODO` que hay hoy en el código:

- **Conectar Supabase** — sigue sin conectar.
- **Flujo "Get a quote"** — el formulario de captación fue **eliminado** de la página.
  Todos los botones "Get a quote" y "Start a conversation" están **visibles pero sin
  acción**. El primer paso es un **input de email + dominio** (estilo Lemonade) que
  guarda el lead inmediatamente y dispara el scan de Capa 1. Implementación técnica y
  diseño visual pendientes. (`Hero.tsx`, `Navbar.tsx`, `OceanPrefooter.tsx`)
- **Etiquetar o retirar precios placeholder** del panel de océano antes de lanzar
  (ver §7). (`OceanPanel.tsx`)
- **Scores ilustrativos** 72 y 86 del panel — el Score Engine no existe todavía.
  (`OceanPanel.tsx`)
- **Reexportar wordmark** con contraformas fusionadas si llega una versión nueva del
  diseñador.
- **Verificar estadísticas** y añadir fuentes antes de lanzar. (`AiGapSection.tsx`)
- **Reemplazar testimonios** ficticios por reales. (`lib/mock/testimonials.ts`,
  `Testimonials.tsx`)
- **Reemplazar eventos regulatorios** del feed por eventos reales verificados.
  (`AiGapCards.tsx`)
- **Validar redacción regulatoria** (MGA / surplus lines / Lloyd's) con abogado — sigue
  pendiente para cuando ese texto reaparezca en Partners/About. (`HowWeOperate.tsx`, ya
  fuera de la landing)
- **Validar nombres de las 8 coberturas** con abogado/carrier — menos urgente ahora que
  no se muestran, pero no resuelto. (`lib/coverages.ts`, sin consumir)
- **Revisar con abogado los nombres de marca de la cinta 1** (Harvey, CoCounsel, Lexis+
  AI, Microsoft Copilot, ChatGPT, Google Gemini): son marcas de terceros sin acuerdo con
  nosotros. La frase "Protecting firms that use" se eligió justamente para no insinuar
  patrocinio ni alianza. (`components/landing/ToolsBelt.tsx`)
- **Decidir dónde vuelve a verse el detalle de coberturas** (ver §9).
- **Reemplazar el correo** `hello@arca.com` del footer: es de relleno y además usa un
  dominio que ya no es el nuestro (sería `@arcacover.com`). (`Footer.tsx`)

**Hechos (completados):**
- ~~Recomprimir `ocean.mp4`~~ — 13.3 MB → 4.4 MB (1600×900, H.264 CRF 25 con
  denoise, sin pista de audio). La versión de 13.3 MB sigue en el historial de
  git; el repo no adelgaza sin reescribir historia.
- ~~Actualizar cinta de coberturas (10 → 8 definitivas).~~
- ~~Rediseñar sección Products (2 tarjetas → recorrido interactivo).~~
- ~~Actualizar menú Coverages del navbar (quitar SLA, dejar una opción).~~
- ~~Favicon configurado.~~
- ~~Wordmark SVG reemplaza logo de texto.~~
- ~~Imagen de Open Graph~~ — `public/og.png` dibujada con código, conectada en
  `metadata.openGraph` y `metadata.twitter`, con `metadataBase` apuntando a
  arcacover.com.
- ~~Rediseñar Testimonials~~ — de carrusel de tarjetas blancas a una tarjeta grande
  de case study con fondo animado.
- ~~Retirar la foto de stock~~ del fondo de Testimonials y sustituirla por seda
  generada con código. Con esto **desaparece el bloqueante de licencia**: no queda
  ningún asset de terceros en el proyecto.
- ~~Unificar el fondo de la página~~ en un solo lienzo iluminado (ver §5).
- ~~Aplicar el copy deck revisado por el CCO~~ — metadatos, hero, paso 03 de Products,
  los tres pilares de "What we do" y las tres descripciones de "How we operate".
- ~~Reestructurar la landing al orden narrativo del CCO~~ — dos cintas nuevas
  (herramientas y riesgos) sustituyen la de coberturas, AI Gap sube por encima de
  Products, y "What we do" y "How we operate" salen del render. La página pasó de 10 a 9
  secciones; mide 4.490px de alto en 1440 (el alto anterior no quedó medido).
- ~~Recortar el aire muerto bajo el hero~~ — el hero pasó de 902px a 736px en 1440×900,
  así que la cinta 1 ya rompe el pliegue en vez de empezar justo debajo.

---

## 10. Cómo debes comportarte al programar

Estos cuatro principios (basados en observaciones de Andrej Karpathy) aplican
**siempre**. Sesgan hacia cautela sobre velocidad; para tareas triviales usa el sentido
común.

### 10.1 Pensar antes de codear
No asumas. No escondas tu confusión. Muestra las alternativas.
- Declara tus supuestos. Si dudas, **pregunta** en vez de inventar.
- Si hay varias interpretaciones, **preséntalas**; no elijas una en silencio.
- Si existe un enfoque más simple, **dilo**. Haz *push-back* cuando corresponda.

### 10.2 Simplicidad primero
El mínimo código que resuelve el problema. Nada especulativo.
- Ninguna funcionalidad más allá de lo pedido; nada de abstracciones de un solo uso.
- Nada de "flexibilidad" no solicitada ni manejo de errores imposibles.
- Si escribiste 200 líneas y bastaban 50, **reescríbelo**.

### 10.3 Cambios quirúrgicos
Toca solo lo necesario. Limpia solo tu propio desorden.
- No "mejores" código, comentarios ni formato vecinos; no refactorices lo que no está roto.
- Respeta el estilo existente. Si ves código muerto no relacionado, **menciónalo, no lo borres**.
- Cada línea cambiada debe rastrearse a lo que se pidió.

### 10.4 Ejecución guiada por objetivos
Define criterios de éxito y verifícalos **midiendo en el navegador**, no a ojo.
- Enuncia un plan breve con su verificación para tareas de varios pasos.
- Si no pudiste comprobar algo (p. ej. el panel del navegador congelado), **dilo** en
  vez de dar por bueno lo que no viste.

---

## 11. Cómo trabajar con el fundador

- El fundador **no es ingeniero**. Explica lo técnico en simple; profundiza solo si lo pide.
- Antes de escribir código para una tarea grande, **propón un plan y espera confirmación**.
- Prefiere pasos **pequeños e incrementales**.
- Ante varias opciones válidas, ofrece **2-3 alternativas con pros/contras y una
  recomendación**.
- Considera siempre el **costo** (infra, licencias, tiempo, créditos): etapa temprana.
- Si algo contradice una decisión de este archivo, **adviértelo explícitamente** antes
  de proceder.
- **Guarda en git** al terminar cada tarea, con mensaje en inglés. Si un commit falla,
  **avisa de inmediato** (ya pasó una vez por permisos y se acumuló trabajo sin guardar).

### Rendimiento (vigilar)

La página ya carga: el orbe del hero (rAF), la cinta de coberturas y **tres secciones
con vídeo de océano** (Products, panel de tarjetas de la sección AI gap y pre-footer).
El shader WebGL del pre-footer fue sustituido por el vídeo. Cada sección monta **dos
`<video>`** del mismo archivo para el bucle sin corte (`lib/useVideoLoop`), o sea seis
elementos en total, aunque el archivo se descarga una sola vez. Conviene medirlo en un
móvil real antes de lanzar.

A eso se suma la **seda de Testimonials**: cuatro capas desenfocadas girando. Es barata
porque el desenfoque se rasteriza una vez y solo se anima el `transform`, que va al
compositor — pero son cuatro bucles más que hay que contar al medir.

**Regla:** toda animación en bucle debe **pausarse cuando su sección no está en
pantalla** (IntersectionObserver), y todo efecto debe respetar
`prefers-reduced-motion`. Al añadir animaciones nuevas, evaluar el impacto y avisarlo.

---

## 12. Timeline y hitos (target: Lloyd's Lab Cohort 18, diciembre 2026)

### Agosto 2026
- Landing page + página Partners
- Onboarding de Jesús
- Contactar Sebastián Gómez y Paola Neira
- Componentes base del frontend

### Septiembre 2026
- Capa 1 funcionando (POST /scan → Pre-Score en <60 seg)
- Pantalla de Pre-Score + Quick Scan Report PDF
- Conectar frontend con API real
- Testear con 50 firmas reales
- Contactar Costero Brokers y Argentum Re

### Octubre 2026
- Cuestionario adaptativo (Capa 2) integrado
- Pantalla de resultados completos + pricing
- Full Assessment Report PDF (5 páginas)
- Dashboard del broker
- Auth con magic links
- Primeras conversaciones con candidatos de Insurance Advisor

### Noviembre 2026
- Funciones de compartir del broker (link + email + PDF branded)
- Checkout con Stripe (test mode)
- Panel admin
- Dashboard cliente post-bind (mockup funcional)
- Demo a 3-5 brokers reales con feedback documentado
- Insurance Advisor comprometido

### Diciembre 2026
- Aplicación a Lloyd's Lab Cohort 18
- Deck de pitch + demo en vivo
- Scoring engine con 50+ scorecards completos y feedback de brokers

---

## 13. Registro de decisiones (bitácora)

- Modelo de negocio: **MGA de surplus lines** en EE. UU., aspirando a coverholder de
  Lloyd's. Nicho: riesgos de IA para servicios profesionales (legal, accounting,
  consulting).
- **Referencia principal: Coalition** (scoring automático + brokers + active insurance).
- Arquitectura: **API-first**.
- Stack: TypeScript · Next.js · Tailwind CSS · Supabase (Postgres + Auth) · Stripe
  (pagos, test mode) · Expo/React Native (fase posterior) · Vercel. Iconos: lucide-react.
  shadcn/ui aprobado para plataforma (no landing).
- Identidad: paleta marino/cielo/oro (+ oro oscuro, bruma, rojo) y tipografías
  Space Grotesk + Mulish. Concepto de marca: refugio + ojo + inclusión.
- **Todo el código en inglés**; texto del sitio en inglés.
- Reglas de honestidad: nada falso ni no verificado en producción; sin assets ajenos.
- Landing institucional construida y iterada: hero con orbe interactivo, cinta de
  coberturas, tarjetas de producto con chips en hover, sección de stats + cards
  animadas, pre-footer con océano WebGL, footer.
- Formulario de captación **eliminado**; flujo "Get a quote" rediseñado como email +
  dominio estilo Lemonade (pendiente implementación).
- **Pivote de producto:** SLA paramétrico sale del scope actual (pasa a Fase 2-3).
  Producto core único: **AI Professional Malpractice** (AI Professional Liability).
- **8 coberturas definidas:** 4 third-party + 4 first-party.
- **ICPs definidos:** primario = firmas de abogados SMB (2-50 abogados), secundario =
  firmas contables/consultoras SMB (5-100 empleados).
- **Score Engine diseñado:** 3 capas (Autopilot → Deep Scan → Living Score), 6
  dominios NIST, 5 tiers, triple función (lead gen + underwriting + demo Lloyd's Lab).
- **3 flujos de adquisición:** Directo, Directo→Broker, Broker invita.
- **Modelo de organizaciones:** firma como org, roles owner/admin/member/viewer.
- **Onboarding de brokers:** manual (discovery call + aprobación del CEO).
- **Equipo:** Juan José (CEO/frontend), Jesús (Founder Engineer/backend), Insurance
  Advisor (por contratar).
- **Timeline:** agosto–diciembre 2026, target Lloyd's Lab Cohort 18.
- **Prioridad estratégica #1:** entrada a Lloyd's Lab.
- **Producto renombrado** de AI Professional Shield a **AI Professional Malpractice**.
- **Sección Products reconstruida** como recorrido interactivo con panel de océano en
  vídeo.
- **Wordmark oficial** sustituye al logo de texto; **favicon** configurado.
- **Menú Partners** (Producers / Platforms) añadido al navbar.
- **Decisión consciente** de mostrar precios ilustrativos sin etiqueta en el panel de
  océano — pendiente de resolver (disclaimer o retirar) antes de lanzar.
- **Dominio confirmado: arcacover.com.**
- **Fondo de la página unificado:** se descarta alternar blanco/bruma; hero y cuerpo
  comparten un único lienzo iluminado (`--color-canvas` + halos). Se probó antes un
  gris plano y se rechazó por no verse premium.
- **Testimonials rediseñado** a una tarjeta grande de case study, con datos mock **solo
  de firmas legales** (salen las contables y consultoras).
- **Fondos y visuales siempre con código:** la foto de stock del fondo de testimonios
  se sustituyó por seda generada en CSS. Hoy **no queda ningún asset de terceros** en
  el proyecto, así que no hay licencias que resolver antes de lanzar.
- **Imagen de Open Graph** creada, también dibujada con código.
- **Copy revisado por el CCO y aplicado** (metadatos, hero, un paso de Products,
  pilares de "What we do", bloque de "How we operate").
- **Audiencia del texto visible: abogados.** El sitio dice "lawyers" y "your practice";
  accounting y consulting salen de la superficie aunque siguen en el ICP secundario.
- **Inventario de copy** en `docs/copy-deck.md`, a mantener cuando cambien textos.
- **Landing reordenada al arco narrativo del CCO:** herramientas → problema → riesgos →
  solución → prueba social → CTA. La cinta de coberturas se sustituye por dos cintas
  nuevas (`ToolsBelt`, `RisksBelt`); "What we do" y "How we operate" **salen de la
  landing sin borrarse** (imports comentados en `app/page.tsx`, destino Partners/About).
- **Consecuencia pendiente de la reestructura:** el sitio ya no enumera las 8 coberturas
  ni aclara que Lloyd's es una aspiración. Ambas cosas hay que recolocar antes de lanzar.
- **Componentes nuevos de la landing viven en `components/landing/`**, no en la raíz de
  `components/`. Es la primera subcarpeta; lo que se añada a la landing va ahí.
- **Repo migrado a organización GitHub** (agosto 2026): el frontend pasó de
  `jotaotonomi/arcacc` a la organización `ArcaCover` como `Arca-front`
  (`https://github.com/ArcaCover/Arca-front`). Owners: cuenta de empresa + cuenta
  personal del CEO. Claude Code corre en la nube (ya no local). Jesús tendrá su propio
  repo de backend en la misma organización.
- *(pendiente)* Modelo de datos detallado (schema).
- *(pendiente)* Lenguaje del backend de Jesús (TypeScript vs Python).
- *(pendiente)* Proveedores externos (email transaccional, firma electrónica).
- *(pendiente)* Librerías de charts, PDF, formularios para la plataforma.
