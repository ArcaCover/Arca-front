# Webapp de ARCA: layout completo y módulos de muestra

- **Fecha:** 2026-10-29
- **Estado:** spec escrita por Claude a pedido de Jesús, que pidió arrancar sin preguntas
- **Rama:** `feat/webapp-ui-mock` (sale de `feat/webapp-orgs`, solo local)
- **Base:** DN-10 de Arca-back (`docs/design-notes/DN-10-webapp-organizaciones-y-cobro.md`)

## 1. Por qué

DN-10 dejó un esqueleto funcional de `/app`: login simulado, organizaciones, roles, paywall,
pago simulado, miembros, borrado por solicitud y un panel de administración. Funciona, pero es
una barra superior con cuatro pestañas y listas sencillas. Jesús pidió **"añadirle carne, sin
sistema nervioso"**: un layout mejor, más pantallas y más botones, aunque sean de muestra,
para que el equipo de front reciba algo avanzado sobre lo que rediseñar.

"Sin sistema nervioso" significa **ninguna conexión nueva con el back**. Lo que ya está conectado
desde DN-10 (sesión, `/me`, análisis, miembros, cobro, borrado, admin) se conserva tal cual. Todo
lo nuevo vive en datos locales.

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**

1. Un shell de aplicación de verdad: barra lateral con secciones, barra superior con selector de
   organización, búsqueda, notificaciones, botón de nuevo análisis y menú de usuario, y navegación
   móvil.
2. Siete pantallas nuevas que muestran hacia dónde va el producto: Overview, Análisis (lista y
   detalle), Plan de acción, Monitoreo, Cobertura, Documentos, Actividad y Ayuda.
3. Las cuatro pantallas existentes (Members, Billing, Settings y la lista de análisis) se rehacen con
   el nuevo layout, sin perder ninguna de sus llamadas reales.
4. Cada botón hace algo visible: cambia estado local, abre un modal o un panel lateral, o muestra un
   aviso de "vista previa". Ninguno queda muerto.

**No objetivos**

- Endpoints, tablas o contratos nuevos. Nada en Arca-back cambia.
- Persistir el estado de muestra: al recargar, el plan de acción y las alertas vuelven a su estado
  inicial.
- Rediseñar `/app/admin`, `/app/login`, `/app/signup` ni `/app/invite`. Heredan solo lo que el shell
  cambie por fuera.
- Diseño visual definitivo: el equipo de front puede cambiarlo. Se busca una base ordenada y
  coherente con la marca, no la versión final.

**Antiobjetivos** (lo que haría fallar el trabajo aunque funcione)

- Que un dato de muestra parezca real. Una aseguradora no puede mostrar primas, eventos
  regulatorios, clientes ni benchmarks inventados como si fueran ciertos (CLAUDE.md §7).
- Que un botón de muestra simule el éxito de algo que no ocurrió: "Incidente reportado",
  "Cotización enviada" o "Pago actualizado".
- Romper el flujo real de DN-10: el paywall (402 a billing), el pago simulado, las invitaciones, los
  403 visibles en modo debug y el aviso de borrado pendiente.
- Que el código de muestra se cuele en producción como si fuera funcional.

## 3. Restricciones

- **Stack existente**: Next 16 (App Router), React 19, Tailwind 4 con los tokens de `globals.css`,
  `lucide-react` para iconos y fuentes Space Grotesk y Mulish. **Sin dependencias nuevas**: ni
  librería de gráficos, ni de componentes, ni de estado. Los gráficos se dibujan con SVG a mano.
- **Marca (CLAUDE.md §5)**:
  - Nunca hex sueltos en componentes; los tonos intermedios se derivan con `color-mix`.
  - Rojo solo para errores y alertas; oro solo para CTA y datos destacados, con texto marino encima.
  - Esquinas muy redondeadas y botones píldora.
- **Honestidad (CLAUDE.md §7)**:
  - Todo bloque que muestre datos de muestra lleva la etiqueta visible `Sample data`.
  - Las cifras sin fuente (benchmark, historial de score) dicen "Illustrative".
  - No hay primas en pesos o dólares en ninguna parte.
  - No se nombran marcas de terceros (herramientas de IA, software jurídico).
  - Los eventos de monitoreo son genéricos y no citan organismos ni casos reales.
- **Idioma**: texto visible y código en inglés (CLAUDE.md §3). Esta spec va en español.
- **Accesibilidad**:
  - Navegación por teclado completa.
  - `aria-current` en la navegación.
  - Diálogos con foco atrapado y cierre con Escape.
  - Contraste AA en el texto.
- **Movimiento**: animaciones solo de entrada y de estado, con `prefers-reduced-motion`. Ningún bucle
  infinito.
- **Modos (DN-09)**: nada de esto importa de `lib/debug/`. `npm run build` debe seguir con 0 fugas
  de debug.
- **Pruebas**:
  - `typecheck`, `lint` y `test` en verde.
  - `app-flow.test.tsx` se ajusta solo donde el layout movió algo.
  - `npm run test:browser:webapp` (smoke de DN-10) sigue pasando.

## 4. Mapa de pantallas

| Ruta | Estado | Datos reales (API de DN-10) | Datos de muestra |
|---|---|---|---|
| `/app` Overview | rehecha | análisis (`listAnalyses`, conserva el 402 a billing), org, aviso de pago, borrado y past_due | historial de score, KPI, alertas, benchmark |
| `/app/analyses` | nueva (la lista sale de `/app`) | análisis | — |
| `/app/analyses/[scanId]` | nueva | el análisis, sacado de `listAnalyses` | línea de tiempo |
| `/app/action-plan` | nueva | acciones del último assessment, si existe | acciones extra, responsables, fechas y estado |
| `/app/monitoring` | nueva | — | próximo re-escaneo, alertas |
| `/app/coverage` | nueva | — | estado de la póliza, coberturas, límites ilustrativos |
| `/app/documents` | nueva | lista de análisis (para sus reportes) | documentos y subida de evidencia local |
| `/app/members` | rehecha | todo lo actual | — |
| `/app/billing` | rehecha | todo lo actual | historial de facturas, contacto de facturación |
| `/app/settings` | rehecha con pestañas | org y solicitud de borrado actuales | perfil de la firma, notificaciones, seguridad, integraciones |
| `/app/activity` | nueva | — | registro de actividad |
| `/app/help` | nueva | — | preguntas frecuentes, contacto, formulario de comentarios |

**Paywall en las pantallas de muestra.** Las pantallas nuevas no llaman al back, así que nada las
bloquearía con un 402. Si `org.paidAccess` es falso, muestran un estado bloqueado ("Choose a plan
to unlock…", con botón a `/app/billing`) en lugar del contenido. El back sigue siendo la autoridad
sobre los datos reales; esto solo impide que la vista previa contradiga al paywall. Billing,
Members, Settings y Help no se bloquean, como hoy.

## 5. Shell

**Escritorio (≥ `lg`)**: barra lateral fija de unos 256 px, con el wordmark arriba y tres grupos:

- **Workspace**: Overview, Analyses, Action plan, Monitoring, Coverage, Documents
- **Organization**: Members, Billing, Settings, Activity
- **Pie**: Help & support, el enlace a `/app/admin` si `me.platformAdmin`, y una tarjeta pequeña
  con el estado de la org (plan activo, pendiente de pago o borrado pendiente).

Cada ítem lleva icono de `lucide-react`, `aria-current="page"` y una píldora de contador donde
aplique: acciones abiertas y alertas sin leer, ambas de muestra.

**Barra superior**:

- Selector de organización. Es el `<select>` actual con iniciales de la org; con una sola org, solo
  el nombre.
- Búsqueda. Filtra en local una lista fija de pantallas y elementos de muestra y abre un panel de
  resultados; Enter navega.
- Botón dorado "New analysis" que lleva a `/quote`.
- Campana con contador y panel de alertas de muestra, con "Mark all as read" local.
- Menú de usuario con email, rol en la org activa, Settings, Help y **Sign out**, que conserva el
  comportamiento actual.

**Móvil (< `lg`)**: barra superior con botón de menú que abre la navegación en un panel lateral
(diálogo con foco atrapado); la búsqueda pasa a un icono.

**Encabezado de página** (componente común): título, descripción corta y una ranura de acciones a
la derecha. Debajo del encabezado van los avisos de la org que hoy salen en `/app`: borrado
pendiente y past_due. **Se muestran en todas las pantallas privadas.** El aviso de pago recibido
(`?paid=1`) sigue solo en `/app`.

**Franja de debug**: el `pt-6` actual se conserva para que la franja fija de DN-09 no tape la
barra superior.

## 6. Pantallas

### 6.1 Overview (`/app`)

1. **Avisos**: los textos actuales, sin cambios (los usan pruebas y el smoke):
   - "Payment received. Your organization is active." / "Payment is being confirmed."
   - Borrado pendiente
   - past_due
2. **Último análisis**: la tarjeta real del análisis más reciente, con el dominio como título,
   `ScoreGauge`, `TierBadge` y fecha. Botones "View analysis" (a su detalle) y "Run a new analysis"
   (a `/quote`). Sin análisis, un estado vacío con el mismo botón.
3. **Fila de KPI** (4 tarjetas):
   - Acciones abiertas (muestra)
   - Alertas sin leer (muestra)
   - Miembros (muestra; no se añade una llamada)
   - Cobertura: "Not active · ARCA does not bind policies yet". Es texto fijo y verdadero.
4. **Tendencia del score**: línea SVG de 6 meses, marcada como `Sample data · Illustrative`.
5. **Plan de acción**: las 3 primeras acciones, con casilla y puntos, y un enlace a la pantalla
   completa.
6. **Monitoreo**: las 3 alertas más recientes y un enlace a la pantalla.
7. **Acciones rápidas**:
   - New analysis
   - Invite a teammate (a Members)
   - Download full report: deshabilitado, con "Coming soon"
   - Talk to a broker: modal de vista previa
   - Book a call: enlace real a `https://calendly.com/arcacover/discovery`, ya usado en la landing
8. **Benchmark**: "Percentile among firms in your state", con un número de muestra, marcado como
   "Illustrative: not computed from real firms".
9. **Lista de análisis**: ya no está aquí. Se mueve a `/app/analyses`. La pantalla conserva la
   llamada a `listAnalyses`, así que el 402 sigue llevando a billing.

### 6.2 Analyses (`/app/analyses` y `/app/analyses/[scanId]`)

**Lista**: tabla con dominio, tipo ("Scan only" o "Scan and assessment"), score, tier, fecha y
acciones:

- View
- Re-run, que lleva a `/quote`
- Download, deshabilitado

Filtros en píldoras (All, With assessment, Scan only), orden por fecha o score, y en móvil la tabla
pasa a tarjetas. **Compare**: al marcar dos filas, un panel muestra sus barras lado a lado.

**Detalle**: busca el análisis por `scanId` en la misma respuesta de `listAnalyses`; si no está,
muestra "Analysis not found". Tiene cuatro pestañas:

- Overview: la `AnalysisCard` actual
- Signals: las señales de Capa 1 con `signalsToCards` y `SignalCard`
- Action plan: las acciones del assessment
- History: línea de tiempo de muestra

El aviso del modelo de demostración de `AnalysisCard` se conserva.

### 6.3 Action plan (`/app/action-plan`)

Lista agrupada por estado (To do, In progress, Done), con un resumen arriba: progreso y puntos
potenciales. Cada acción muestra título, dominio, puntos y responsable (selector con miembros de
muestra), fecha límite y selector de estado. Hay filtros por dominio y por responsable.

Las acciones vienen del último assessment real cuando existe, más unas de muestra marcadas como
tales. El estado es local, y un aviso dice que se reinicia al recargar.

### 6.4 Monitoring (`/app/monitoring`)

- **Tarjeta de re-escaneo**: "Monthly re-scan · next on …" (fecha de muestra) y el botón "Run
  re-scan now", que da un aviso de vista previa.
- **Lista de alertas** con filtros (All, Regulatory, Firm signals, Industry). Cada alerta tiene
  severidad (informativa, media, alta; la alta usa rojo por ser alerta), fecha y estado leído o no
  leído. Al abrir una, un panel lateral muestra la explicación y la acción sugerida; los botones son
  "Mark as read", "Dismiss" y "Create action", que la añade al plan local.
- **Textos genéricos**, por ejemplo "A state bar published new guidance on generative AI in
  filings". Todos llevan `Sample data`.

### 6.5 Coverage (`/app/coverage`)

1. **Estado**: "No active policy". Explica que ARCA aún no tiene acuerdo con un carrier y por eso no
   emite pólizas. Es el mismo hecho que dice el documento de negocio.
2. **Qué cubriría la póliza**: las 8 coberturas, tomadas de `components/coverage/coverage-details.ts`
   (nombres y descripción corta), en dos grupos, con la nota "Coverage names pending validation".
3. **Opciones de límites**: Essential $50K/$100K, Professional $250K/$500K y Complete $1M/$2M.
   Muestra **solo los límites**, sin prima, con la etiqueta "Illustrative".
4. **Botones**:
   - "Request a quote": modal "Quotes open once ARCA has a carrier partner"
   - "Connect with a broker": modal de vista previa
   - "Report an incident": panel lateral con formulario (fecha, descripción y quién lo detectó). Al
     enviarlo dice "Preview only. Nothing was sent." y deja el formulario como estaba.

### 6.6 Documents (`/app/documents`)

- **Reportes por análisis**: Quick Scan Report y Full Assessment Report. Ambos con botón
  deshabilitado y "Coming soon": el PDF real de Capa 1 usa el token del scan, que la webapp no tiene.
- **Documentos de la firma**: plantillas de muestra, como "AI use policy template", "Supervision
  checklist" e "Incident response plan".
- **Zona de evidencia**: un selector de archivo que lista en local nombre y tamaño, con el aviso "Not
  uploaded: preview only". Nada sale del navegador.

### 6.7 Members (`/app/members`)

Conserva intactos todos los textos y etiquetas que usan las pruebas y el smoke:

- "Email to invite", "Send invitation", "Copy invite link", "Invite link copied."
- `Role for …`, `Remove …`, `Revoke invitation for …`
- la regla de botones activos en modo debug

Además:

- Tarjetas por persona con iniciales, rol y fecha real (`joinedAt`).
- Búsqueda local.
- **Matriz de permisos** dibujada desde `ROLE_PERMISSIONS` del contrato (real, no de muestra).
- "Transfer ownership", deshabilitado con "Coming soon".

### 6.8 Billing (`/app/billing`)

Conserva todo lo real: estado, planes desde la API, "Pay with …", "Manage billing" y "Only the owner
can manage billing." Además:

- **Tarjeta de plan actual** con el estado real.
- **Historial de facturas**: tabla de muestra con fecha, periodo, estado y un botón de descarga
  deshabilitado. No muestra montos, para no inventar cifras de cobro.
- **Contacto de facturación**: formulario local con aviso de vista previa.

### 6.9 Settings (`/app/settings`)

Pestañas:

- **General**: la ficha actual de la org (real), más el perfil de la firma: estado principal,
  número de abogados y áreas de práctica. Es local, con "Save" que da un aviso de vista previa.
- **Notifications**: interruptores locales por tipo de alerta y frecuencia de resumen.
- **Security**: sesiones de muestra y "Sign out other sessions" (vista previa). El texto dice que
  el acceso es por enlace mágico, sin contraseña.
- **Integrations**: categorías genéricas ("Practice management", "Document storage", "Email"), sin
  marcas, todas "Coming soon".
- **Data & privacy**: la solicitud de borrado actual, intacta en lógica y textos.

### 6.10 Activity (`/app/activity`)

Registro de muestra con quién, qué, cuándo y desde dónde (`web` o `invite`), filtros por persona y
tipo, y "Export CSV" deshabilitado. Refuerza la idea de trazabilidad de CLAUDE.md §8.

### 6.11 Help (`/app/help`)

- **Preguntas frecuentes** en acordeón, con contenido verdadero: qué es el score, por qué no hay
  póliza todavía, quién ve qué según el rol, cómo se borra la organización.
- **Contacto**: `hello@arcacover.com` y el enlace de Calendly.
- **"Send feedback"**: formulario con aviso de vista previa.

## 7. Piezas comunes

**Kit de UI** en `components/app/ui/`, pequeño y sin abstracciones de un solo uso:

- `PageHeader`, `Card`, `StatCard`, `Button` (primary oro, secondary y danger)
- `Badge` (incluye `SampleBadge`), `Tabs`, `EmptyState`, `LockedState`
- `Modal` y `Drawer`, sobre `<dialog>` nativo
- `Toast` (con un proveedor en el layout), `Sparkline` (SVG)

**Datos de muestra** en `lib/app/mock/`:

- Un archivo por dominio: `alerts.ts`, `actions.ts`, `activity.ts`, `documents.ts`, `history.ts`,
  `invoices.ts`, `team.ts` y `search.ts`.
- Datos deterministas, sin `Math.random`, para que pruebas y capturas sean estables.
- Fechas relativas a "hoy" calculadas una vez.
- Cabecera de archivo: `// Sample data for the /app preview. Not connected to the API (see spec 2026-10-29).`

**Estado de muestra compartido**: el plan de acción y las alertas se comparten entre Overview, la
barra lateral (contadores) y sus pantallas. Viven en un contexto ligero (`SampleStateProvider`) en
el layout, con `useReducer`. No se persisten.

**Avisos de vista previa**: un único texto para toda la app, "Preview only: this isn't connected
yet.", más el detalle de cada caso.

## 8. Verificación

1. `npm run typecheck`, `npm run lint` y `npm test` en verde, con pruebas nuevas para:
   - la navegación (`aria-current`, grupos, enlace de admin solo para platform admin)
   - el estado bloqueado sin pago
   - el reductor del estado de muestra (cambiar estado de una acción, marcar alertas)
   - que cada bloque de muestra lleve `Sample data`
   - que los textos del flujo real sigan presentes
2. `npm run build`, con 0 fugas de debug.
3. Con `npm run stack -- mock`, `npm run test:browser:webapp` en verde.
4. Revisión visual en el navegador a 1440 px y a 390 px de cada pantalla, y capturas para Jesús.

## 9. Decisiones que tomé (revisables)

- Usar barra lateral en lugar de pestañas arriba: con diez secciones, las pestañas no caben.
- Mover la lista de análisis de `/app` a `/app/analyses`. El Overview conserva la tarjeta del
  último análisis y la llamada que activa el paywall.
- Bloquear en el front las pantallas de muestra sin pago, para que la vista previa no contradiga el
  paywall.
- Contadores y KPI de muestra en lugar de llamadas extra, para no añadir conexiones.
- No mostrar montos en facturas ni primas en cobertura, aunque CLAUDE.md tenga una fórmula de
  prima: el fundador pidió no implementar pricing.
- Estado de muestra solo en memoria; recargar lo reinicia, y la pantalla lo dice.

## 10. Lo que queda a criterio de quien implemente

- La distribución exacta de cada grilla y los tamaños.
- Los textos de muestra concretos, siempre que cumplan la §3.
- Los iconos de `lucide-react`.
- Si `Tabs` usa rutas o estado local. Recomendación: estado local, salvo en el detalle de análisis.
