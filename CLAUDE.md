# CLAUDE.md — Proyecto ARCA

> Este archivo es la **memoria del proyecto**. Claude Code lo lee automáticamente al
> inicio de cada sesión. Mantenlo actualizado: cuando tomemos una decisión firme
> (stack, arquitectura, convención), se anota aquí.

---

## 1. Qué es Arca

Arca es una **aseguradora 100% digital**. Arranca operando como **MGA (Managing
General Agent)**: hacemos suscripción (underwriting), distribución, emisión y
administración de pólizas **en nombre de una aseguradora/reaseguradora ("carrier")
que asume el riesgo en su balance**. Arca gana **comisión/fee**, no primas de riesgo.

**Nicho inicial:** riesgos ligados a la **Inteligencia Artificial** — cobertura para
empresas frente a daños por uso/desarrollo/dependencia de sistemas de IA (fallos o
"alucinaciones" de modelos, responsabilidad civil por decisiones automatizadas,
comportamiento de agentes autónomos, sesgos/discriminación algorítmica, brechas de
datos vinculadas a IA, interrupción de servicios de IA de terceros, incumplimiento
regulatorio, propiedad intelectual generada por IA).

**Se construye en tres capas:**
1. **Sitio web institucional** — la cara al mercado: marketing, contenido, captación de leads.
2. **Plataforma** — cotizador, motor de suscripción/reglas, emisión y gestión de
   pólizas, portal de cliente, backoffice/admin, reporting hacia el carrier.
3. **App móvil** — cliente final: ver pólizas, reportar siniestros, notificaciones.

La plataforma web y la app móvil tendrán **las mismas funcionalidades**; son solo
canales distintos hacia la misma lógica.

---

## 2. Estado del proyecto y decisiones confirmadas

- **Mercado inicial:** Estados Unidos. La regulación de seguros en EE. UU. es **estado
  por estado** (no federal). El riesgo de IA es novedoso → probablemente cae en el
  mercado de **líneas excedentes (E&S / surplus lines)**.
- **Carrier:** aún **no** hay carrier con acuerdo. Consecuencia: por ahora **no se emiten
  pólizas reales**. El foco inicial es la "cara" (sitio institucional + captación de
  leads) y, a lo sumo, un **estimador de cotización orientativo, NO vinculante**.
- **Equipo:** un solo fundador **no técnico**, construyendo con Claude Code.
- **Plazo del primer entregable:** menos de 3 meses.
- **Orden de prioridad:** primero el **sitio web institucional**; después la plataforma
  (con paridad de funciones entre web y móvil).
- **Principio de arquitectura confirmado:** **API-first**. Toda la lógica de negocio
  vive en un **backend/API central**; web y móvil son capas delgadas que la consumen.
  Nunca duplicar la lógica de negocio en el frontend.

### Stack tecnológico confirmado

- **Lenguaje único en todo el proyecto:** **TypeScript** (web, backend y móvil).
- **Web (institucional + plataforma):** **Next.js** (React full-stack; frontend y
  backend en un solo proyecto). Se usa el renderizado en servidor para que el sitio
  institucional tenga buen **SEO**.
- **Base de datos, autenticación y almacenamiento:** **Supabase** (por debajo es
  **Postgres**). Se aprovechan su autenticación de usuarios y su **seguridad a nivel de
  fila (Row Level Security)** para aislar los datos de cada asegurado. La lógica de
  suscripción compleja puede vivir en una capa de backend propia dentro de Next.js.
- **App móvil (fase posterior):** **Expo / React Native**, reutilizando la lógica y las
  validaciones ya escritas en TypeScript para mantener paridad con la web.
- **Hosting inicial:** **Vercel** para la web; Supabase gestiona su propia infra.
- **Convención:** las validaciones y tipos de datos se escriben **una sola vez** y se
  comparten entre capas; no reescribir la misma regla en dos lugares.

## 3. Decisiones AÚN NO tomadas (no las inventes)

Hasta que el fundador las confirme explícitamente, **no asumas** ni des por hechas:

- Diseño detallado del modelo de datos (entidades, tablas, relaciones).
- Proveedores externos adicionales (email transaccional, pagos, firma electrónica, etc.).
- Librerías concretas de UI, formularios o validación (proponer y confirmar antes de fijar).

Si una tarea necesita una de estas decisiones, **detente y pregúntalo** antes de codear.

---

## 4. Cómo debes comportarte al programar (principios base)

Estos cuatro principios (inspirados en las observaciones de Andrej Karpathy sobre
errores típicos de los modelos al programar) aplican **siempre**. Sesgan hacia
**cautela sobre velocidad**; para tareas triviales (un typo, un cambio obvio de una
línea) usa el sentido común, no toda la rigurosidad.

### 4.1 Pensar antes de codear
No asumas. No escondas tu confusión. Muestra las alternativas.
- Declara tus supuestos de forma explícita. Si tienes dudas, **pregunta**.
- Si hay varias interpretaciones posibles, **preséntalas** — no elijas una en silencio.
- Si existe un enfoque más simple, **dilo**. Haz *push-back* cuando corresponda.
- Si algo no está claro, **detente**, nombra qué te confunde y pregunta.

### 4.2 Simplicidad primero
El mínimo código que resuelve el problema. Nada especulativo.
- Ninguna funcionalidad más allá de lo pedido.
- Nada de abstracciones para código de un solo uso.
- Nada de "flexibilidad" o "configurabilidad" que no se pidió.
- Nada de manejo de errores para escenarios imposibles.
- Si escribiste 200 líneas y bastaban 50, **reescríbelo**.
- Prueba mental: "¿un ingeniero senior diría que esto está sobrecomplicado?" Si sí, simplifica.

### 4.3 Cambios quirúrgicos
Toca solo lo necesario. Limpia solo tu propio desorden.
- No "mejores" código, comentarios ni formato vecinos.
- No refactorices lo que no está roto.
- Respeta el estilo existente, aunque tú lo harías distinto.
- Si ves código muerto no relacionado, **menciónalo — no lo borres**.
- Elimina solo los imports/variables/funciones que **tus** cambios dejaron sin uso.
- Prueba: cada línea cambiada debe poder rastrearse directamente a lo que se pidió.

### 4.4 Ejecución guiada por objetivos
Define criterios de éxito. Itera hasta verificarlos.
- "Agrega validación" → "Escribe tests para entradas inválidas y haz que pasen".
- "Arregla el bug" → "Escribe un test que lo reproduzca y luego haz que pase".
- "Refactoriza X" → "Asegúrate de que los tests pasan antes y después".
- Para tareas de varios pasos, enuncia un plan breve con su verificación:
  ```
  1. [Paso] → verificar: [chequeo]
  2. [Paso] → verificar: [chequeo]
  3. [Paso] → verificar: [chequeo]
  ```

---

## 5. Reglas de datos sensibles y seguridad (obligatorias)

Arca maneja datos personales y sensibles de asegurados, y es una aseguradora, así que
todo debe ser cuidadoso desde el inicio:

- **Nunca** escribas secretos (claves, tokens, contraseñas, credenciales) directamente
  en el código. Usa **variables de entorno**.
- **Nunca** expongas datos de asegurados en logs, mensajes de error o URLs.
- Diseña pensando en **trazabilidad y auditoría**: para acciones importantes debe poder
  saberse **quién hizo qué, cuándo y por qué**.
- Si una tarea implica manejar datos personales de forma nueva, **avísalo** — puede tener
  implicaciones regulatorias que el fundador debe validar con un especialista.

*(Nota: el asesor no es abogado ni asesor legal certificado; estas reglas son buenas
prácticas, no asesoría legal.)*

---

## 6. Cómo trabajar con el fundador

- El fundador **no es ingeniero**. Explica lo técnico en términos simples cuando haga
  falta; profundiza solo cuando lo pida.
- Antes de escribir código para una tarea grande, **propón primero un plan y la
  estructura de archivos, y espera confirmación**.
- Prefiere pasos **pequeños e incrementales** sobre entregas enormes de una sola vez.
- Cuando haya varias opciones válidas, ofrece **2-3 alternativas con pros/contras y una
  recomendación**, no una sola respuesta cerrada.
- Considera siempre el **costo** (infra, licencias, tiempo): etapa temprana, presupuesto limitado.
- Si algo contradice una decisión ya anotada en este archivo, **adviértelo
  explícitamente** antes de proceder ("esto cambia la decisión previa de X, ¿seguro?").

---

## 7. Registro de decisiones (bitácora)

> Añade aquí cada decisión firme con su fecha, para no repetir discusiones ni contradecirnos.

- *(2025) Modelo de negocio: MGA en EE. UU., nicho riesgos de IA.*
- *(2025) Arquitectura: API-first (lógica en backend central; web y móvil consumen la API).*
- *(2025) Stack: TypeScript en todo. Web con Next.js. Datos/auth/almacenamiento con
  Supabase (Postgres). Móvil con Expo/React Native (fase posterior). Hosting en Vercel.*
- *(pendiente) Modelo de datos detallado.*
- *(pendiente) Proveedores externos (email, pagos, firma electrónica).*
