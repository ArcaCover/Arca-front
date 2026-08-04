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

**Nicho:** riesgos ligados a la **Inteligencia Artificial** (fallos de modelos,
responsabilidad por decisiones automatizadas, agentes autónomos, sesgos, brechas de
datos, caída de servicios de IA de terceros, incumplimiento regulatorio, propiedad
intelectual) para empresas de **SERVICIOS PROFESIONALES**:

- **Legal**
- **Accounting**
- **Consulting**

Es un producto **B2B**. Mercado: **Estados Unidos** (regulación estado por estado; el
riesgo de IA es novedoso, por eso surplus lines / mercado no admitido).

**Se construye en tres capas:**
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
- El flujo definitivo de "Get a quote" (ver sección 7, pendientes).

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
- **Oro oscuro `#D4A12A`** — texto dorado sobre claro y estados hover.
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

1. **Navbar** — transformable con scroll: arriba transparente con el logo "arca" grande
   y centrado flotando sobre el hero y solo "My account" a la derecha; al bajar se fija
   con fondo blanco, el logo se reduce y aparece el botón dorado "Get a quote"
   empujando "My account" a su izquierda. Enlaces pegados a los **bordes reales** de la
   ventana (no al ancho del hero). Menús: "Coverages" (SLA, Liability) e "Industries"
   (Legal, Accounting, Consulting — **sin subniveles**). Accesibles por teclado; en
   móvil, hamburguesa con logo centrado.
2. **Hero** — dos columnas. Izquierda: badge **rotativo** ("Built for law firms" →
   independent lawyers → accounting firms → independent accountants → consulting firms →
   independent consultants, en ese orden fijo, ~3s cada uno, en bucle), título,
   subtítulo y CTA dorado. Derecha: **orbe interactivo** que se inclina hacia el cursor
   (halo y anillos lo siguen más lento; flotación automática en táctil; estático con
   reduced-motion).
3. **Cinta de coberturas** — franja centrada a todo el ancho, márgenes simétricos, bajo
   el orbe sin tocar sus anillos, con fundido en los extremos. Muestra las coberturas
   (no las industrias).
4. **Products** — "We insure next-generation services." Dos tarjetas escalonadas: SLA
   (bruma) y Liability (marino), con patrón de arcos, números 01/02 y chips de
   coberturas que se revelan en hover **debajo del botón** (el botón nunca se mueve y no
   queda hueco vacío sin cursor).
5. **"Your policy was written before AI"** — stats con count-up + tres cards animadas
   (documento que falla, barra de sublímite con tooltip, feed regulatorio) .
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

**Coberturas (placeholder de diseño, pendientes de validar con abogado/carrier):**
AI hallucinations · Faulty automated decisions · Professional liability · Data breaches ·
Confidentiality breaches · IP infringement · Algorithmic bias · AI service outages ·
Regulatory non-compliance · Third-party AI failures.
Reparto: **SLA** → AI service outages, Third-party AI failures, AI hallucinations.
**Liability** → el resto.

### Pendientes marcados en el código (TODO)

- **Conectar Supabase** — sigue sin conectar.
- **Flujo "Get a quote"** — el formulario de captación fue **eliminado** de la página.
  Todos los botones "Get a quote" y "Start a conversation" están **visibles pero sin
  acción**. El plan es un **modal** (ventana emergente) con nombre, apellido, correo,
  celular y comentario, inspirado en Lemonade. **Es la primera captura de datos
  personales reales del proyecto**: al montarlo hay que resolver privacidad y guardado
  en Supabase.
- **Verificar estadísticas** y añadir fuentes antes de lanzar.
- **Reemplazar testimonios** ficticios por reales.
- **Reemplazar eventos regulatorios** del feed por eventos reales verificados.
- **Validar redacción regulatoria** (MGA / surplus lines / Lloyd's) con abogado.
- **Añadir imagen de Open Graph**.

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

La página ya carga: el orbe del hero, un shader WebGL de océano y varias animaciones en
bucle. **Regla:** toda animación en bucle debe **pausarse cuando su sección no está en
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
- *(pendiente)* Modelo de datos detallado.
- *(pendiente)* Proveedores externos (email, pagos, firma electrónica).
