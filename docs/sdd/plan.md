# Plan: pase de mantenimiento — dedup write-back, fix busy(), tests de categorize(), eliminar código muerto de licencia Pro

> Copiado desde el plan aprobado en modo Plan de Claude Code (que se guarda localmente en la máquina de cada persona, no en el repo) para que quede visible en el historial del equipo. Ejecutado en la PR #5.

## Contexto

El usuario pidió revisar código y arquitectura de `gestor-financiero`, refactorizar donde tenga sentido y completar la suite de tests, siguiendo la metodología SDD ya adoptada en el repo (`.claude/skills/sdd/SKILL.md`, `CLAUDE.md`). Se leyó el código completo (`index.html` 1282 líneas, `lib.js` 187 líneas, `tests.html` 206 líneas) y se validó con un agente de planificación contra el código real (línea a línea).

**Resultado de la revisión:** no hay problemas de arquitectura graves. El proyecto es un single-file HTML consistente con su propia convención (lógica pura sin DOM en `lib.js`, todo lo demás en `index.html`). Se identificaron 4 mejoras concretas de bajo riesgo, más una decisión de producto ya resuelta con el usuario (eliminar código muerto de una función "Pro" que nunca se conectó a ninguna UI). Es un spec pequeño (5 tareas) — no hace falta dividirlo.

**Fuera de alcance, decisión explícita:** el patrón de estado de `index.html` (`rows`/`boards`/`syncBoard()`/`loadBoardData()`, variables globales mutables) no se toca. No hay bug conocido que lo justifique, es el idioma establecido del repo (mismo patrón que `customCats`/`rebuildCats()`), y el coste de una regresión sutil en una app en producción con datos financieros reales, sin tests automatizados de UI, es alto frente a un beneficio no demostrado. Si en el futuro aparece un problema concreto atribuible a este patrón, se aborda como spec propio (con fase de Research primero).

---

## Tarea 1 — Deduplicar el bloque de write-back a Google Sheets

**Archivo:** `index.html` únicamente. (`writeBackCell`, del que depende, ya vive en `index.html` porque hace `fetch` real — no es lógica pura, sigue la convención del repo de que solo lo DOM-free sin I/O va en `lib.js`.)

Bloque idéntico duplicado en dos sitios:
- `setCat(id,cat)`
- `applyBulkCategory()`

**Nuevo helper**, junto a `writeBackCell`:
```js
function writeBackCategoryChange(r, c){
  if(!r.src || !c) return;
  if(r.src.catCol) writeBackCell(r.src.gid, r.src.row, r.src.catCol, c.label);
  if(r.src.fjCol && c.tipo) writeBackCell(r.src.gid, r.src.row, r.src.fjCol, c.tipo==="fijo"?"Fijo":"Variable");
}
```

Riesgo: nulo — refactor mecánico, mismo comportamiento, sin cambios de firma pública ni de datos persistidos.

---

## Tarea 2 — Fix: botón "Desde Google Sheets" de la pantalla de aterrizaje no se bloquea durante la carga

`busy(on,label)` solo actuaba sobre `["pickBtn","addBtn","driveBtn"]`. El botón del dropdown de cabecera ya tenía `id="driveBtn"` y estaba cubierto. El botón de la pantalla vacía no tenía `id`, así que seguía clickable durante `importFromDrive()` — doble click antes de tener ningún board podía disparar dos importaciones concurrentes.

**Fix:** id nuevo `driveBtnLanding` + añadido al array de `busy()`.

---

## Tarea 3 — Completar cobertura de tests de `categorize()`

Faltaban casos de `suministros` y `ocio`, y el criterio de desempate (keyword más larga gana) no tenía ningún test. Se añadieron 3 casos usando keywords reales de `KEYS`, incluyendo un desempate real (`uber` vs `uber eats`).

`eur()` se dejó sin test — one-liner sobre `Intl.NumberFormat`, bajo valor.

---

## Tarea 4 — Eliminar código muerto de licencia Pro (Gumroad)

**Decisión del usuario: eliminar ahora** (no dejarlo documentado como pendiente).

Cero referencias a `isPro(`, `GUMROAD`, `proBtn`, `verifyLicenseWithGumroad` en `index.html` — la UI que lo habría usado se borró en una limpieza anterior (PR #1) pero el bloque de `lib.js` sobrevivió, sin wiring, sirviéndose a cada visitante junto con un `fetch` a `api.gumroad.com` que nunca se ejecutaba.

Eliminado de `lib.js`, sus 7 tests de `tests.html`, la mención en `CLAUDE.md`, y ajustada la mención en `UX_AUDIT.md`.

Si en el futuro se retoma la funcionalidad Pro, se recupera del historial de git como base y se hace como spec nuevo con su propia UI end-to-end.

---

## Tarea 5 — Verificación

- `tests.html` en verde: **74/74**, confirmado ejecutando en un navegador real (Edge headless), no solo leyendo el código.
- `index.html` cargado sin errores de JS (comprobado con `window.onerror`).
- Grep final de `GUMROAD|isPro|verifyLicenseWithGumroad|fin:license|LICENSE_STORE` en todo el repo → 0 resultados.
- Smoke test manual en navegador: pendiente de confirmación por el equipo (checklist en la propia PR #5).

## Resultado

Ejecutado en 5 commits semánticos separados (`refactor`, `fix`, `test`, `refactor`, `docs`) en la rama `mantenimiento-refactor-tests`, PR #5.
