# CLAUDE.md — Proyecto ARCA

> Este archivo es la **memoria del proyecto**. Claude Code lo lee automáticamente al
> inicio de cada sesión. Mantenlo actualizado: cuando tomemos una decisión firme
> (stack, arquitectura, marca, convención), se anota aquí.

---

## 1. Qué es Arca

Arca es una **aseguradora 100% digital**. Opera como **MGA (Managing General Agent) de
surplus lines**: hacemos suscripción (underwriting), distribución, emisión y
administración de pólizas **en nombre de una aseguradora/reaseguradora ("carrier") que
asume el riesgo en su balance**. Arca gana **comisión/fee**, no primas de riesgo.

**Aspiración regulatoria:** ser **coverholder de Lloyd's**. Esto es un **objetivo en
curso, NO un hecho logrado**. Nunca se presenta como conseguido en ningún texto público.

### Producto core

**ARCA AI Professional Malpractice** — seguro de **AI Professional Liability**
(Responsabilidad Civil Profesional por uso de Inteligencia Artificial). Cubre a
profesionales cuando la IA que usan para trabajar produce un error que daña a su cliente.

Es el **único producto en scope actual**. El seguro tipo SLA paramétrico (cobertura por
caída/degradación de servicios de IA de terceros, con trigger automático) se movió al
**roadmap de largo plazo (Fase 2-3)**: necesita data de frecuencia/severidad que no
existe todavía para AI service outages. No se elimina, se pospone.

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

Es un producto **B2B**. Mercado: **Estados Unidos** (regulación estado por estado; el
riesgo de IA es novedoso, por eso surplus lines / mercado no admitido).

**ICP Primario:** firmas de abogados SMB en EE.UU. (2-50 abogados), que usan IA
generativa (ChatGPT, Claude, Copilot, Harvey AI, Clio AI) para investigación, drafting
y análisis. Áreas de práctica: litigio, corporativo, inmigración, estate planning, tax.
Jurisdicciones prioritarias: Florida, Texas, California, New York, Illinois.
Prima estimada: USD 1,500–15,000/año.

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

## 2. Estado del proyecto y decisiones confirmadas

- **Carrier:** aún **no** hay carrier con acuerdo. Consecuencia: **no se emiten pólizas
  reales** todavía. El foco actual es el sitio institucional.
- **Equipo:** un solo fundador **no técnico**, construyendo con Claude Code.
- **Producto core definido:** AI Professional Malpractice. Flujo de cotización diseñado a
  nivel de negocio (5 fases). Pendiente de implementación técnica.
- **Principio de arquitectura:** **API-first**. Toda la lógica de negocio vive en un
  backend/API central; web y móvil son capas delgadas que la consumen. Nunca duplicar
  la lógica de negocio en el frontend.

### Stack tecnológico confirmado

- **Lenguaje único:** **TypeScript** (web, backend y móvil), modo estricto.
- **Web:** **Next.js** (App Router). Renderizado en servidor para buen **SEO**.
- **Estilos:** **Tailwind CSS** (v4; tokens declarados en `globals.css`).
- **Tipografías (gratuitas, vía `next/font`):** **Space Grotesk** (títulos) y **Mulish**
  (textos). No usar fuentes de pago ni cargar Google Fonts con `<link>`.
- **Iconos:** `lucide-react` (única librería de UI permitida hasta ahora).
- **Datos / auth / almacenamiento:** **Supabase** (Postgres). **Aún NO conectado**: el
  cliente está cableado a variables de entorno pero dormido.
- **App móvil (fase posterior):** **Expo / React Native**, reutilizando lógica y
  validaciones en TypeScript.
- **Hosting inicial:** **Vercel**.
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

### Idioma — dos niveles (regla estricta)

1. **Texto visible del sitio:** en **INGLÉS** (mercado EE. UU.).
2. **Todo el código en INGLÉS**: variables, funciones, componentes, archivos, tablas,
   endpoints, comentarios y mensajes de commit. Sin excepción. El fundador escribe los
   prompts en español, pero **nada se traduce al español en el código**.

## 3. Decisiones AÚN NO tomadas (no las inventes)

Hasta que el fundador las confirme explícitamente, **no asumas**:

- Modelo de datos detallado (entidades, tablas, relaciones).
- Proveedores externos adicionales (email transaccional, pagos, firma electrónica).
- Librerías concretas de formularios o validación.
- Implementación técnica del AI Governance Scorecard y motor de pricing.
- Diseño visual del flujo de cotización (las 5 fases están definidas a nivel de
  negocio, no a nivel de UI/UX).

---

## 4. Identidad de marca

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
dentro de un **círculo blanco**. Alternar secciones claras (blanco/bruma) con bloques
marino para dar ritmo. Nunca copiar a Lemonade ni a ninguna marca real.

### Paleta de color y roles (usar exactamente estos hex, siempre vía tokens)

- **Marino `#1C2C5B`** — ancla: títulos, textos, secciones oscuras, navbar.
- **Cielo `#6CABDD`** — calma: fondos suaves, etiquetas, detalles, el orbe.
- **Oro `#FFC659`** — acento cálido, SOLO para CTAs y algún dato destacado. El texto
  sobre oro va en **marino**, nunca en blanco.
- **Oro oscuro `#D4A12A`** — texto dorado sobre claro, estados hover, eyebrows sobre
  fondo claro.
- **Blanco `#FFFFFF`** — lienzo principal.
- **Bruma `#E4F4F7`** — fondos alternos de sección.
- **Rojo `#EC3325`** — RESERVADO solo para alertas y errores.

**Convención de tokens:** colores y fuentes se definen **una sola vez** como tokens y se
usan por nombre. **Nunca escribir un hex suelto en un componente.** Los tonos
intermedios que no existan en la paleta se **derivan de los tokens con `color-mix`**
(como se hizo con los degradados del orbe).

**Excepción documentada:** la paleta interna del **shader WebGL del océano** (constantes
GLSL de agua, cielo, espuma y brillo) se deja tal cual, porque son parte del algoritmo
de render y atarlas a tokens cambiaría el aspecto aprobado. Va con un comentario que lo
explica.

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

---

## 5. Reglas de honestidad y contenido (obligatorias — es una aseguradora)

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

## 6. Reglas de datos sensibles y seguridad

- **Nunca** escribir secretos (claves, tokens, contraseñas) en el código. Usar
  **variables de entorno**; `.env.local` ignorado por git y `.env.example` sin valores.
- **Nunca** exponer datos de asegurados en logs, mensajes de error o URLs.
- Diseñar pensando en **trazabilidad y auditoría**: quién hizo qué, cuándo y por qué.
- Si una tarea implica manejar datos personales de forma nueva, **avisarlo**: puede
  tener implicaciones regulatorias a validar con un especialista.

*(No somos asesores legales; son buenas prácticas, no asesoría legal.)*

---

## 7. Estado de la landing institucional

**Secciones actuales, en orden:**

1. **Navbar** — transformable con scroll: arriba transparente con el **wordmark SVG**
   grande y centrado flotando sobre el hero y solo "My account" a la derecha; al bajar
   se fija con fondo blanco, el wordmark se reduce y aparece el botón dorado "Get a
   quote" empujando "My account" a su izquierda. Enlaces pegados a los **bordes reales**
   de la ventana (no al ancho del hero). Menús: "Coverages" (una sola opción: AI
   Professional Malpractice), "Industries" (Legal, Accounting, Consulting — **sin
   subniveles**) y "Partners" (Producers, Platforms). Accesibles por teclado; en móvil,
   hamburguesa con logo centrado.
2. **Hero** — dos columnas. Izquierda: badge **rotativo** ("Built for law firms" →
   independent lawyers → accounting firms → independent accountants → consulting firms →
   independent consultants, en ese orden fijo, ~3s cada uno, en bucle), título,
   subtítulo y CTA dorado. Derecha: **orbe interactivo** que se inclina hacia el cursor
   (halo y anillos lo siguen más lento; flotación automática en táctil; estático con
   reduced-motion).
3. **Cinta de coberturas** — franja centrada a todo el ancho, márgenes simétricos, bajo
   el orbe sin tocar sus anillos, con fundido en los extremos. Muestra las **8 coberturas
   definitivas** y se alimenta de `lib/coverages.ts`. Lleva encima el micro-título
   "What we cover".
4. **Products** — recorrido interactivo del producto:
   - Fondo bruma, tarjeta blanca de ~1080px, esquinas de ~40px.
   - **Encabezado fuera de la tarjeta (centrado):** headline "AI Professional Shield:
     coverage for the mistakes AI makes in your name." + subtítulo "One policy built for
     the risks your current coverage ignores." (mismo estilo tipográfico que la sección
     "Your policy was written before AI").
   - **Eyebrow** `FROM ASSESSMENT TO COVERAGE` en oro oscuro arriba de los pasos.
   - **Izquierda:** 4 features con auto-avance de ~5.5s y barra de progreso dorada. Clic
     salta y reinicia. Features: Know your risk in minutes · See where you stand · Get
     real numbers · Bind in minutes.
   - **Derecha:** panel de ~560×420 con vídeo de océano (`public/videos/ocean.mp4`) y 4
     escenas (scorecard → gauge → cotizaciones → timeline de emisión).
   - **Nota:** las 8 coberturas ya no se muestran en esta sección — solo viven en la
     cinta del hero. `COVERAGE_GROUPS` de `lib/coverages.ts` quedó sin consumir aquí.
5. **"Your policy was written before AI"** — stats con count-up + tres cards animadas
   (documento que falla, barra de sublímite con tooltip, feed regulatorio).
6. **Testimonials** — carrusel con placeholders ficticios.
7. **How we operate** — MGA / surplus lines / Lloyd's como aspiración.
8. **Pre-footer océano** — shader WebGL, "Don't navigate AI risk alone", CTA "Start a
   conversation" (sin acción todavía).
9. **Footer** — Contact, Resources, Company (Partners, Blog, Careers), Follow us.

**Textos clave actuales:**
- Título hero: "Insurance for businesses that rely on AI."
- Subtítulo hero: "AI moves faster than the risks it creates. Arca is the eye that
  watches over them, from model failures to automated decisions, so your business stays
  protected."
- Metadatos: title "Arca: AI Liability Insurance for Law, Accounting & Consulting Firms".

**Coberturas (definidas por el CEO y Co-CEO; pendiente validación final con
abogado/carrier):**
AI Work Product Errors · AI Regulatory Sanctions · AI Bias & Discrimination ·
AI Privacy & Confidentiality Breach · Error Remediation · AI Forensic Investigation ·
Crisis Management · Regulatory Compliance Costs.
**Producto único:** AI Professional Malpractice (las 8 coberturas).

### Pendientes marcados en el código (TODO)

- **Conectar Supabase** — sigue sin conectar.
- **Flujo "Get a quote"** — el formulario de captación fue **eliminado** de la página.
  Todos los botones "Get a quote" y "Start a conversation" están **visibles pero sin
  acción**. El flujo ahora tiene un **diseño completo de negocio** (5 fases: Lead
  Capture → AI Governance Scorecard → Risk Report → Quote Generation → Binding &
  Issuance — ver §11.4). Implementación técnica y diseño visual pendientes. El paso
  inmediato sigue siendo un **modal de captación de leads** (Fase A) como puerta de
  entrada.
- **Recomprimir `public/videos/ocean.mp4`:** 13.3 MB para 5.2 segundos (21 Mbps).
  Debería pesar 1-2 MB. Ya está en el historial de git con ese peso.
- **Etiquetar o retirar precios placeholder** del panel de océano antes de lanzar
  (ver §5).
- **Reexportar wordmark** con contraformas fusionadas si llega una versión nueva del
  diseñador.
- **Verificar estadísticas** y añadir fuentes antes de lanzar.
- **Reemplazar testimonios** ficticios por reales.
- **Reemplazar eventos regulatorios** del feed por eventos reales verificados.
- **Validar redacción regulatoria** (MGA / surplus lines / Lloyd's) con abogado.
- **Añadir imagen de Open Graph**.

**Hechos (completados):**
- ~~Actualizar cinta de coberturas (10 → 8 definitivas).~~
- ~~Rediseñar sección Products (2 tarjetas → recorrido interactivo).~~
- ~~Actualizar menú Coverages del navbar (quitar SLA, dejar una opción).~~
- ~~Favicon configurado.~~
- ~~Wordmark SVG reemplaza logo de texto.~~

---

## 8. Cómo debes comportarte al programar

Estos cuatro principios (basados en observaciones de Andrej Karpathy) aplican
**siempre**. Sesgan hacia cautela sobre velocidad; para tareas triviales usa el sentido
común.

### 8.1 Pensar antes de codear
No asumas. No escondas tu confusión. Muestra las alternativas.
- Declara tus supuestos. Si dudas, **pregunta** en vez de inventar.
- Si hay varias interpretaciones, **preséntalas**; no elijas una en silencio.
- Si existe un enfoque más simple, **dilo**. Haz *push-back* cuando corresponda.

### 8.2 Simplicidad primero
El mínimo código que resuelve el problema. Nada especulativo.
- Ninguna funcionalidad más allá de lo pedido; nada de abstracciones de un solo uso.
- Nada de "flexibilidad" no solicitada ni manejo de errores imposibles.
- Si escribiste 200 líneas y bastaban 50, **reescríbelo**.

### 8.3 Cambios quirúrgicos
Toca solo lo necesario. Limpia solo tu propio desorden.
- No "mejores" código, comentarios ni formato vecinos; no refactorices lo que no está roto.
- Respeta el estilo existente. Si ves código muerto no relacionado, **menciónalo, no lo borres**.
- Cada línea cambiada debe rastrearse a lo que se pidió.

### 8.4 Ejecución guiada por objetivos
Define criterios de éxito y verifícalos **midiendo en el navegador**, no a ojo.
- Enuncia un plan breve con su verificación para tareas de varios pasos.
- Si no pudiste comprobar algo (p. ej. el panel del navegador congelado), **dilo** en
  vez de dar por bueno lo que no viste.

---

## 9. Cómo trabajar con el fundador

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

La página ya carga: el orbe del hero (rAF), la cinta de coberturas, un shader WebGL de
océano en el pre-footer, **y un vídeo de océano en bucle** en la sección Products. Son
**dos océanos en la misma página**. Conviene medirlo en un móvil real antes de lanzar.

**Regla:** toda animación en bucle debe **pausarse cuando su sección no está en
pantalla** (IntersectionObserver), y todo efecto debe respetar
`prefers-reduced-motion`. Al añadir animaciones nuevas, evaluar el impacto y avisarlo.

---

## 10. Registro de decisiones (bitácora)

- Modelo de negocio: **MGA de surplus lines** en EE. UU., aspirando a coverholder de
  Lloyd's. Nicho: riesgos de IA para servicios profesionales (legal, accounting,
  consulting).
- Arquitectura: **API-first**.
- Stack: TypeScript · Next.js · Tailwind CSS · Supabase (Postgres) · Expo/React Native
  (fase posterior) · Vercel. Iconos: lucide-react.
- Identidad: paleta marino/cielo/oro (+ oro oscuro, bruma, rojo) y tipografías
  Space Grotesk + Mulish. Concepto de marca: refugio + ojo + inclusión.
- **Todo el código en inglés**; texto del sitio en inglés.
- Reglas de honestidad: nada falso ni no verificado en producción; sin assets ajenos.
- Landing institucional construida y iterada: hero con orbe interactivo, cinta de
  coberturas, tarjetas de producto con chips en hover, sección de stats + cards
  animadas, pre-footer con océano WebGL, footer.
- Formulario de captación **eliminado**; flujo "Get a quote" pendiente (modal + Supabase).
- **Pivote de producto:** SLA paramétrico sale del scope actual (pasa a Fase 2-3).
  Producto core único: **AI Professional Malpractice** (AI Professional Liability).
- **8 coberturas definidas:** 4 third-party (Work Product Errors, Regulatory Sanctions,
  Bias & Discrimination, Privacy & Confidentiality Breach) + 4 first-party (Error
  Remediation, Forensic Investigation, Crisis Management, Regulatory Compliance Costs).
- **ICPs definidos:** primario = firmas de abogados SMB (2-50 abogados), secundario =
  firmas contables/consultoras SMB (5-100 empleados).
- **AI Governance Scorecard diseñado:** 20 preguntas, 6 dominios NIST, 5 tiers de
  riesgo, triple función (lead gen + underwriting + demo Lloyd's Lab).
- **Flujo de cotización completo** diseñado a nivel de negocio (5 fases: Lead Capture →
  Scorecard → Risk Report → Quote Generation → Binding & Issuance).
- **Prioridad estratégica #1:** entrada a Lloyd's Lab.
- **Producto renombrado** de AI Professional Shield a **AI Professional Malpractice**.
- **Sección Products reconstruida** como recorrido interactivo con panel de océano en
  vídeo; las 8 coberturas salen de esa sección y viven solo en la cinta.
- **Wordmark oficial** sustituye al logo de texto; **favicon** configurado.
- **Menú Partners** (Producers / Platforms) añadido al navbar.
- **Decisión consciente** de mostrar precios ilustrativos sin etiqueta en el panel de
  océano — pendiente de resolver (disclaimer o retirar) antes de lanzar.
- *(pendiente)* Modelo de datos detallado.
- *(pendiente)* Proveedores externos (email, pagos, firma electrónica).

---

## 11. Estrategia de negocio y mercado

### 11.1 Posicionamiento y diferenciación

**Elevator pitch:** "ARCA es el seguro de malpractice para la era de la inteligencia
artificial."

**Analogía de posición:** Armilla asegura al que FABRICA el cuchillo de IA. Testudo
asegura al que lo VENDE. ARCA asegura al CHEF que lo usa para cocinar y sin saberlo
sirve un plato contaminado.

**Competidores directos (3) — NO nombrar en textos comerciales (ver §5):**

| Competidor | A quién asegura | Espacio que no cubren |
|---|---|---|
| **Armilla AI** (Lloyd's coverholder, Toronto) | Empresas que CONSTRUYEN IA | No cubre profesionales que USAN IA |
| **Testudo** (Lloyd's Lab alumni) | Mid-market que DESPLIEGA GenAI | No enfocado en professional services SMB |
| **HSB / Munich Re** | SMBs (gap de CGL por IA) | No cubre professional E&O / malpractice |

**Posición de ARCA:** profesionales que USAN IA para servir a clientes. Nadie está ahí.

### 11.2 Ruta regulatoria

- **Hoy:** agente de seguros. No hay binding authority, no suscribimos, no emitimos.
- **Prioridad #1:** entrar a **Lloyd's Lab** (accelerator de Lloyd's of London).
- **Ruta:** Agente → Lloyd's Lab → Coverholder con syndicate sponsor → MGA con binding
  authority → eventualmente Carrier.
- **Lo que mostramos a Lloyd's Lab:** AI Governance Scorecard funcionando como
  herramienta de suscripción + tesis de mercado (gap de professional liability por IA).
- **Competidores que pasaron por Lloyd's Lab:** Armilla AI (Chaucer como sponsor),
  Testudo (Cohort 14, Apollo como sponsor). Cubren segmentos distintos al nuestro.

### 11.3 AI Governance Scorecard (resumen para contexto técnico)

Herramienta web donde una firma profesional responde **20 preguntas** sobre cómo usa IA.
En **10-12 minutos** recibe un puntaje de riesgo de **0-100** con un reporte de
vulnerabilidades y recomendaciones.

**Triple función:**
1. **Lead generation** — toda firma que lo complete es un prospecto calificado.
2. **Motor de suscripción** — el score determina precio y vía de underwriting.
3. **Demo para Lloyd's Lab** — herramienta de risk assessment que un syndicate no puede
   replicar internamente.

**6 dominios (alineados con NIST AI Risk Management Framework):**

| Dominio | Peso | Qué evalúa |
|---|---|---|
| D1. AI Governance & Policy | 25% | Política escrita, ownership, herramientas aprobadas |
| D2. AI Tool Environment | 20% | Enterprise vs consumer, casos de uso, dependencia |
| D3. Human Oversight & Review | 20% | Proceso de revisión, seniority, checklist, disclosure |
| D4. Data Protection & Confidentiality | 15% | Datos de clientes en IA, controles, consentimiento |
| D5. Training & Competency | 10% | Programa de training, awareness de limitaciones |
| D6. Incident Preparedness | 10% | Plan de respuesta, monitoreo, historial de incidentes |

**5 tiers de riesgo:**

| Tier | Score | Nombre | Acción de underwriting |
|---|---|---|---|
| 1 | 85-100 | **FORTRESS** | Auto-bind. Mejores tarifas. Quote instantáneo. |
| 2 | 70-84 | **FORTIFIED** | Auto-bind. Tarifas estándar. Quote instantáneo. |
| 3 | 50-69 | **GUARDED** | Referral a underwriter. Tarifas cargadas. Quote en 48h. |
| 4 | 30-49 | **EXPOSED** | Referral. Tarifas altas + condiciones. Quote en 5 días. |
| 5 | 0-29 | **CRITICAL** | Decline. Plan de mejora + re-assessment en 90 días. |

Documento de diseño detallado disponible para implementación (ARCA_Scorecard_Design.pdf).

### 11.4 Flujo de cotización (5 fases)

- **Fase A — Lead Capture (~2 min):** datos de la firma (nombre, estado, número de
  profesionales, área de práctica, email). Alimenta los factores de pricing.
- **Fase B — AI Governance Scorecard (~10 min):** 20 preguntas por dominio, barra de
  progreso, mini-score por dominio, score total instantáneo al terminar.
- **Fase C — Risk Report (inmediato):** PDF descargable con score total, tier, score por
  dominio, top 3 vulnerabilidades, top 3 fortalezas, recomendaciones. Se genera aunque
  no compre — es el lead magnet.
- **Fase D — Quote Generation:** 3 opciones de límite (Good / Better / Best). El path
  bifurca por tier:
  - Tier 1-2: "Bind Now" → aceptar → warranty → pagar → póliza instantánea.
  - Tier 3: "Get Final Quote" → docs adicionales → review 48h → quote → bind.
  - Tier 4: "Request Review" → docs completos → call con underwriter → quote 5 días.
  - Tier 5: "Improve Your Score" → roadmap de remediación → re-assessment 90 días.
- **Fase E — Binding & Issuance:** warranty statement (firma electrónica), pago
  (anual con 5% descuento / semestral / mensual; tarjeta o ACH), policy document
  automático, datos para bordereaux (reporting al syndicate).

**Fórmula de pricing:**
`Prima Anual = Base Rate × Governance Factor × Size Factor × Practice Factor × Jurisdiction Factor`
Factores detallados en ARCA_Scorecard_Design.pdf. No implementar hasta que el fundador
lo indique.

### 11.5 Catalizador de mercado

En enero 2026 Verisk/ISO publicó una exclusión de IA generativa (Form CG 40 47).
Dato reportado: afecta al 82% de las pólizas de P&C globales. **⚠ VERIFICAR fuente y
cifra exacta antes de usar en cualquier texto público.** Las pólizas de professional
liability tradicionales están en zona gris sobre si cubren errores causados por IA.
ARCA llena ese hueco.

### 11.6 Documentos de referencia del CEO

- **ARCA_Scorecard_Design.pdf** — preguntas completas, puntajes, fórmula de pricing,
  rate multipliers, controles anti-fraude, flujo paso a paso.
- **ARCA_OnePager.pdf** — one-pager con producto, mercado, competencia, roadmap.
- **ARCA_Guia_JuanJose.pdf** — versión simplificada con analogías.
