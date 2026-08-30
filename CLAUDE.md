# CLAUDE.md — Instrucciones de trabajo para Claude Code

> Este archivo se lee automáticamente en cada sesión de Claude Code en este repo, antes de hacer cualquier cambio.

---

## Stack del proyecto

- **App:** single archivo `index.html` (HTML + CSS + JS) + `lib.js` (lógica pura sin DOM) + `localStorage` del navegador. Sin backend, sin build, sin dependencias que instalar.
- **Tests:** `tests.html` — ábrelo en el navegador, no hace falta servidor ni build. No hay suite en Python/Playwright en este repo.
- **Control de versiones:** Git + GitHub, rama `main` protegida por Pull Request (ver README, sección "Desarrollo / cómo contribuir").
- **Documentación:** `README.md` (qué hace la app y cómo usarla/contribuir) + `docs/TECHNICAL.md` (arquitectura, decisiones técnicas, estructura de datos) + `CHANGELOG.md` (historial) + `UX_AUDIT.md` (hallazgos de diseño/accesibilidad) + `docs/sdd/` (specs/planes aprobados de la metodología SDD).
- **Metodología SDD:** ver la skill `.claude/skills/sdd/SKILL.md` para el flujo completo (cuándo definir spec/plan técnico antes de programar, dimensionamiento de specs, reglas de oro). Este archivo se centra en el checklist de cierre y las reglas críticas específicas de este repo.

---

## Proceso de cierre de cada funcionalidad

### 1. Verificar tests
Abre `tests.html` en el navegador. Deben pasar **todos** (resumen verde arriba) antes de continuar. Si tocaste `lib.js` y no hay test para el caso nuevo, añádelo — no solo lo pruebes a mano.

### 2. Probar en el navegador
- Abrir en incógnito (sin caché)
- Verificar la funcionalidad implementada
- Verificar modo claro y oscuro
- Verificar que nada anterior se rompió (sobre todo si tocas `index.html`)

### 3. Actualizar la documentación si hay cambios de arquitectura
`docs/TECHNICAL.md` si cambia la estructura de datos, una clave de `localStorage`, o cómo funciona algo por dentro. `README.md` si cambia dónde vive un botón en la interfaz o cómo se usa una funcionalidad.

### 4. Actualizar CHANGELOG.md
Añadir una entrada bajo la fecha de hoy con una frase corta describiendo el cambio.

### 5. Commit y Pull Request
```bash
git checkout -b nombre-del-cambio
git add <archivos tocados>
git commit -m "tipo: descripción breve"   # feat / fix / docs / refactor
git push -u origin nombre-del-cambio
gh pr create ...
```
Nunca commits directos a `main` — siempre rama + PR (ver README).

---

## Convenciones de código de este repo

```javascript
// camelCase para funciones y variables
function categorize(concepto, importe) {}
let rows = [], boards = [];

// localStorage: prefijo "fin:" + nombre
localStorage.getItem('fin:v2')       // datos (pestañas/movimientos)
localStorage.getItem('fin:license')  // estado de licencia Pro
localStorage.getItem('fin:theme')    // tema claro/oscuro
```

```css
/* Siempre variables CSS, nunca colores hardcodeados
   (confirmado como buena práctica en UX_AUDIT.md: es justo lo que
   permitió corregir el contraste WCAG en un solo sitio) */
color: var(--text);
background: var(--base);

/* Incorrecto */
color: #1a1a1a;
```

`lib.js` es la única parte del código con tests automáticos (todo lo que sea DOM/render vive en `index.html` y se prueba a mano en el navegador). Si una función nueva no necesita el DOM, va en `lib.js`, no en `index.html` — así queda testeable.

---

## Reglas críticas

```
1. NUNCA cambiar el nombre de una clave de localStorage existente
   → Rompe los datos guardados de Andrea y de cualquier otra usuaria

2. SIEMPRE comprobar tests.html antes de dar un cambio de lib.js por bueno
   → Nunca subir código con tests en rojo

3. NUNCA hacer commit/push automático sin revisión humana
   → La persona controla qué y cuándo se sube, incluso si Claude Code lo implementó

4. SIEMPRE rama + Pull Request, nunca push directo a main
   → Así se ve el diff antes de fusionar y no os pisáis

5. DECIR explícitamente qué NO tocar en cada petición si aplica
   → p.ej. "no toques la lógica de escritura a Sheets"

6. Todo texto que venga de fuera (Sheets, ficheros importados) se escapa con esc()
   → Ver README, sección Seguridad — evita XSS vía una celda maliciosa
```

---

## Checklist antes de hacer push

```
☐ tests.html en verde (X/X tests correctos)
☐ Probado en el navegador en incógnito
☐ Modo oscuro/claro funciona si aplica
☐ docs/TECHNICAL.md actualizado si hay cambios de arquitectura; README.md si cambia algo de la UI
☐ CHANGELOG.md tiene la entrada de hoy
☐ Commit message en formato semántico (feat/fix/docs/refactor)
☐ No hay claves de API, secretos ni tokens en el código
☐ Es una rama con Pull Request, no un push directo a main
```

---

## Anti-patterns — nunca hacer esto en este repo

```
✗ Programar una funcionalidad nueva sin plan (ver skill SDD) — solo vale para fixes triviales de 1-2 líneas
✗ Tocar lib.js sin actualizar tests.html si el comportamiento cambia
✗ Colores hardcodeados en CSS en vez de las variables --base/--text/--income/...
✗ Cambiar nombres de claves localStorage (fin:v2, fin:license, fin:theme)
✗ Dejar que el agente haga commit/push sin que la persona lo revise antes
✗ Push directo a main saltándose la Pull Request
✗ Mezclar varias funcionalidades no relacionadas en un solo commit
```
