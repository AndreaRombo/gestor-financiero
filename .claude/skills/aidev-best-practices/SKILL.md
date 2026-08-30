---
name: aidev-best-practices
description: Buenas prácticas generales de desarrollo asistido por IA — cómo escribir prompts efectivos, señales de alerta a vigilar en el agente, gestión de contexto entre sesiones, cuándo y cómo refactorizar, higiene de commits, y checklist de sesión. Complementa a la skill `sdd` (que cubre el flujo spec → plan técnico → código). Úsalo como referencia de estilo de trabajo con Claude Code en este repo, junto con `CLAUDE.md`.
---

# AI Development Best Practices

> Principios y patrones para desarrollar con IA de forma efectiva, mantenible y sin perder el control.

**Nota de adaptación a este repo:** esta guía llegó pensada para un proyecto distinto (tests en Python/Playwright, WSL, módulos IIFE tipo `Store`). Aquí no aplican — ver el detalle en cada sección. Para la correspondencia entre "Researcher/Planner/TechPlan/Coder" y cómo funciona realmente Claude Code en este repo, ver la nota al principio de la skill `sdd`.

---

## Principios fundamentales

```
1. El contexto que das = la calidad que recibes
   Un prompt vago produce código vago.
   Un spec bien redactado produce código bien generado.

2. Itera en pasos pequeños
   Una funcionalidad → probar → subir → siguiente.
   Nunca acumules varios cambios sin verificar.

3. Los specs son la memoria del proyecto
   Sin specs el código existe pero nadie sabe por qué.
   En 3 meses no recordarás las decisiones de hoy.
   (En este repo: docs/sdd/spec-N-nombre.md, uno por spec, nunca sobrescrito.)

4. SDD no es seguir el flujo ciegamente
   Es aplicar cada fase cuando aporta valor real.
   Un fix trivial no necesita Research + Plan + TechPlan.

5. Tú controlas el repositorio, siempre
   El agente sugiere y genera. Tú revisas, testeas y subes.
```

---

## Prompts efectivos

### Los 5 elementos de un buen prompt

```
1. CONTEXTO     → qué es el proyecto, quién lo usa
2. INPUT        → ruta de archivos a leer
3. OUTPUT       → ruta donde guardar el resultado (si aplica)
4. ALCANCE      → qué hacer exactamente
5. RESTRICCIÓN  → qué NO tocar
```

### Ejemplo — prompt bien formado para implementar desde un spec

```
Lee el spec:
docs/sdd/spec-N-nombre.md

Y el código actual:
index.html, lib.js

Implementa [funcionalidad X] siguiendo exactamente el spec.

CRÍTICO:
- No toques el módulo Y ni el archivo Z
- Usa la clave localStorage: fin:nombre (si aplica)
- Comportamiento idéntico al actual para funciones existentes

Verifica con tests.html al terminar (ábrelo en el navegador).
Añade tests en tests.html para la nueva funcionalidad si toca lib.js.
```

### Cuándo NO añadir instrucciones extra

```
Si el spec es completo y claro → no añadas nada más.
El agente leerá el spec, el código y decidirá.

Solo guía si tienes razón concreta para hacerlo:
- Restricción técnica que el spec no menciona
- Patrón existente que el agente debe reutilizar
- Algo que definitivamente NO debe tocar
```

---

## Señales de alerta con el agente

Actúa inmediatamente cuando veas esto:

```
- Intenta hacer git commit/push sin que tú lo hayas pedido o revisado
  NO → tú controlas el repositorio (ver CLAUDE.md, regla 3)

- Se queda esperando una notificación indefinidamente en vez de seguir
  Dile: "no esperes notificación, sigue con el resultado que ya tienes"

- Va a tocar más de lo que pediste sin avisar
  Dile: "para, dime primero qué archivos vas a tocar"

- Propone saltarse el spec/plan para una funcionalidad real
  Recuérdale la regla de la skill sdd: fix trivial de 1-2 líneas → directo;
  funcionalidad real → spec primero
```

*(La lista original incluía avisos específicos de WSL/Python/PowerShell —no aplican aquí: este repo se desarrolla en Windows con Git Bash/PowerShell directamente, sin WSL, y no hay tests en Python.)*

---

## Gestión de contexto entre sesiones

```
- El handoff entre fases (research → plan → código) es el archivo
  generado (spec, plan), no el historial del chat — por eso los specs
  se guardan en docs/sdd/, no solo se quedan dicho en la conversación.

- Si vas a pedir una funcionalidad grande, referencia los archivos por
  ruta (index.html, lib.js, docs/TECHNICAL.md) en vez de pegar su
  contenido entero en el prompt — Claude Code ya puede leerlos.

- index.html ronda 1300 líneas — no es tan grande como para que el
  agente "olvide" contexto dentro de una sesión, pero si una tarea es
  muy amplia (tocar varias secciones a la vez) merece más la pena
  dividirla en specs más pequeños que confiar en que todo quepa en una
  sola pasada.
```

---

## Tests — la red de seguridad

```
REGLAS:
- Ejecutar tests.html en el navegador después de cada cambio en lib.js
- Nunca subir con tests en rojo
- Si los tests pasan pero algo visualmente falla → añade un test si es
  lógica de lib.js, o compruébalo a mano si es DOM/render de index.html

CUÁNDO AÑADIR TESTS:
- Toda función nueva en lib.js tiene al menos 1 test
- Todo bug corregido en lib.js tiene al menos 1 test de regresión
- index.html no tiene tests automáticos (ver docs/TECHNICAL.md) — se
  verifica a mano en el navegador, checklist de CLAUDE.md
```

*(No hay tests intermitentes/flaky en este repo — no hay Playwright ni nada asíncrono en la suite, `tests.html` es determinista.)*

---

## Código — patrones y convenciones de este repo

*(La guía original recomienda módulos con patrón IIFE tipo `Store` — este repo no usa ese patrón: el estado vive en variables globales sincronizadas manualmente con el board activo, ver "Patrón de estado" en `docs/TECHNICAL.md`. Es una decisión ya tomada y documentada, no hay que "corregirla" a IIFE.)*

```javascript
// camelCase para funciones y variables
function categorize(concepto, importe) {}
let rows = [], boards = [];

// localStorage: prefijo "fin:" + nombre
localStorage.getItem('fin:v2')
localStorage.getItem('fin:theme')
```

```css
/* Siempre variables CSS, nunca hardcodeado */
color: var(--text);
background: var(--base);

/* Incorrecto */
color: #1a1a1a;
```

### localStorage — reglas de oro

```
1. Nunca cambiar el nombre de una clave existente
   → Rompe datos de usuarias, sin migración automática

2. Documentar en docs/TECHNICAL.md todas las claves
   → Nombre, contenido, qué las usa

3. Siempre con try/catch al parsear
   → JSON.parse puede fallar con datos corruptos (ver load() en index.html)
```

---

## UX/UI — principios

Patrones ya en uso en este repo, para mantener consistencia si añades UI nueva:

```
- Modal con overlay para crear/editar (ver #overlay, #catOverlay)
- Confirmación antes de acciones destructivas (confirm() antes de borrar
  pestaña, vaciar movimientos)
- Toast para feedback de deshacer; banner() para avisos/errores
- Empty state con mensaje + CTA cuando no hay movimientos
- Dropdowns con role="menu"/aria-haspopup para agrupar acciones (ver
  UX_AUDIT.md, hallazgo 6)
- Colores de estado consistentes: verde (--income) = ingreso,
  rojo (--expense) = gasto/peligro, siempre por variable CSS
```

### Accesibilidad

```
- Confirmación antes de acciones irreversibles (ya aplicado)
- Contraste WCAG AA en modo oscuro y claro — hay tests automáticos
  para esto en tests.html, no rompas la paleta sin volver a pasarlos
- Feedback visual en hover y focus (:focus-visible ya definido)
```

---

## Refactoring — cuándo y cómo

```
CUÁNDO:
- Cuando el código se repite en 2+ sitios de forma idéntica
  (ejemplo real: writeBackCategoryChange(), spec-1)
- Antes de añadir una funcionalidad compleja sobre código ya duplicado
- NUNCA en medio de una funcionalidad en curso — es su propio spec

REGLA:
- tests.html en verde ANTES del refactor (red de seguridad)
- tests.html en verde DESPUÉS (sin regresiones)
- El comportamiento visible no cambia — solo la implementación interna
- Si tocas el patrón de estado (rows/boards/syncBoard), necesita
  research primero: alto riesgo, sin tests automáticos de UI que lo cubran
```

---

## Git — flujo de trabajo

Ya en uso en este repo (ver `CLAUDE.md`):

```bash
git checkout -b nombre-del-cambio
git add <archivos>
git commit -m "tipo: descripción breve"   # feat / fix / docs / refactor / test
git push -u origin nombre-del-cambio
gh pr create ...
```

### Un commit = una cosa

```
- "refactor: extraer writeBackCategoryChange"
- "fix: botón Sheets de aterrizaje no se bloquea en carga"
- "test: completar cobertura de categorize()"

- "varios cambios"
- Mezclar refactor + fix + test en un solo commit
```

Ejemplo real de una sesión bien separada: spec-1 (`docs/sdd/spec-1-mantenimiento-refactor-tests.md`) se ejecutó en 5 commits, uno por tipo de cambio.

---

## Documentación — qué mantener actualizado

- **`README.md`**: qué hace la app, cómo usarla, cómo contribuir.
- **`docs/TECHNICAL.md`**: arquitectura, claves de `localStorage`, decisiones técnicas con su porqué.
- **`CHANGELOG.md`**: historial, una entrada por cambio relevante bajo la fecha de hoy. Se mantiene como archivo separado del README (convención estándar tipo "Keep a Changelog"), no fusionado dentro.
- **`docs/sdd/spec-N-*.md`**: un archivo por spec, numerado, nunca sobrescrito.

**Regla:** si añades una clave nueva de `localStorage` o cambias cómo funciona algo por dentro, actualiza `docs/TECHNICAL.md` en el mismo commit o en el siguiente.

---

## Lecciones aprendidas

```
1. Un spec bien redactado vale más que 10 prompts genéricos.
2. Los tests son tu red de seguridad, no una formalidad.
3. El agente no sabe lo que no le dices — si hay un patrón a
   reutilizar (como writeBackCell para I/O), díselo explícitamente.
4. Revisa siempre antes de subir — código correcto no siempre es la
   decisión de diseño que querías.
5. Un objetivo por sesión de planificación.
6. El contexto entre sesiones se pierde — los specs y docs/TECHNICAL.md
   son la memoria persistente. Sin ellos, la siguiente sesión (tuya,
   de Andrea, o de un futuro colaborador) empieza de cero.
7. Iterar pequeño reduce el riesgo — un cambio pequeño que falla es
   fácil de revertir; uno grande puede costar horas en una app en
   producción con datos financieros reales.
```

---

## Checklist de sesión

### Al empezar

```
☐ ¿Qué spec implemento hoy? (si es funcionalidad real, no un fix trivial)
☐ ¿Tengo el plan técnico listo, o hace falta pasar por modo Plan primero?
☐ ¿tests.html está en verde en el estado actual?
☐ ¿Estoy en una rama nueva, no en main?
```

### Al terminar

```
☐ tests.html en verde (X/X correctos)
☐ Probado en el navegador en incógnito
☐ docs/TECHNICAL.md actualizado si hay cambios de arquitectura
☐ CHANGELOG.md con la entrada de hoy
☐ Commits separados por tipo
☐ PR abierta (nunca push directo a main), con reviewer asignado
```
