# Arca — frontend

Sitio de Arca y el embudo `/quote` → scan → `/score` → assessment → resultados, en Next 16.

El front no corre solo: consume los contratos del back con `file:../Arca-back/packages/contracts` y llama a su
API. Clona [ArcaCover/Arca-back](https://github.com/ArcaCover/Arca-back) en la misma carpeta que este repo y
sigue "Ejecutar localmente" en su README. Ahí está todo el arranque, incluido `npm run stack -- mock`, que
levanta los dos repos a la vez.

## Modos de desarrollo

`NEXT_PUBLIC_ARCA_MODE` acepta `mock`, `live-debug` o `production`. Si falta, el modo es `production`.
`.env.example` arranca en `mock`.

- `mock` y `live-debug` muestran una franja con el modo y un panel **State** con el estado de cada pantalla,
  los escenarios de fallo y los atajos del assessment. El back tiene que correr en el mismo modo; si no, la
  franja dice `MODE MISMATCH`.
- Con `production` no hay franja ni panel, y el bundle no lleva código de debug. `npm run build` lo comprueba
  con `scripts/check-no-debug.mjs` y falla si encuentra algo.
- Cualquier modo distinto de `production` hace fallar un build en Vercel.

Comandos de este repo: `npm run dev:mock`, `npm run dev:live-debug`, `npm test`, `npm run typecheck`,
`npm run lint`, `npm run build` y `npm run test:browser:modes` (con el stack en mock corriendo).

Detalle de los comandos: [docs/implementation/arca-modes.md](docs/implementation/arca-modes.md). Diseño,
reglas de seguridad y verificaciones: DN-09 en el repo del back.
