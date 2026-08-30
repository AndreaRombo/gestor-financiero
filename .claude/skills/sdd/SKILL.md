---
name: sdd
description: Metodología Spec-Driven Development (SDD) del proyecto — cómo decidir entre vibe coding y SDD, cómo estructurar spec → plan técnico → código → tests antes de implementar una funcionalidad real, reglas de oro para trabajar con un agente de IA sin perder el control, y checklist antes de hacer push. Úsalo antes de empezar a programar una funcionalidad nueva (no para fixes triviales de 1-2 líneas).
---

# Spec-Driven Development (SDD) — Guía de trabajo personal

> Desarrolla con IA de forma estructurada, reproducible y sin perder el control.

**Nota de adaptación a Claude Code:** esta guía nació nombrando cuatro "agentes" separados (AIDevResearcher, AIDevPlanner, AIDevTechPlan, AIDevCoder) de otra herramienta. En Claude Code no existen como comandos propios — es Claude quien va jugando esos cuatro papeles dentro de la misma conversación: investiga leyendo el código/README, planifica escribiendo el plan/spec en el chat (o usando el modo Plan para forzar la pausa QUÉ+CÓMO antes de tocar código), y luego programa. Las fases y su lógica de cuándo saltarlas siguen aplicando igual; simplemente no esperes un comando `/AIDevPlanner` — pídeselo a Claude explícitamente ("actúa como el Planner: hazme las preguntas de la fase Interview antes de tocar código").

---

## ¿Qué es SDD?

SDD es una metodología de desarrollo asistido por IA donde **defines primero, codificas después**. En vez de lanzar prompts al agente y esperar que adivine, tú defines QUÉ quieres construir y POR QUÉ, y el agente lo convierte en código real.

El resultado es código predecible, con criterios de aceptación verificables y un historial de decisiones documentado.

```
Sin SDD: "Oye, hazme una app de..."  →  código espagueti, contexto perdido
Con SDD: Spec → Plan técnico → Código → Tests → PR limpia
```

---

## Los 3 enfoques de desarrollo con IA

No todo necesita SDD completo. Elige según la tarea:

| Enfoque | Cuándo usarlo | Riesgo |
|---------|--------------|--------|
| **Vibe coding** | Prototipo rápido, exploración | Código espagueti en proyectos grandes |
| **SDD** | Funcionalidad real que vas a mantener | Planificación puede ser excesiva para cambios triviales |
| **Loop engineering** | Tareas autónomas con objetivo claro | Menos control sobre el proceso |

**Regla práctica:** ¿Vas a mantener esto más de una semana? → SDD. ¿Es un experimento de un día? → Vibe coding.

---

## El flujo SDD

```
[Idea]
   ↓
AIDevResearcher (opcional)
   ↓ research.md
AIDevPlanner
   ↓ plan.md + specs/spec-N.md
AIDevTechPlan
   ↓ tech-plan-N.md
AIDevCoder
   ↓ código implementado
[Tú] → revisar → tests → commit → PR
```

### Cuándo saltar fases

```
Research → SALTAR cuando ya tienes el contexto claro
         → USAR cuando hay incertidumbre alta o territorio nuevo

Planner  → NUNCA saltar para funcionalidad real
         → SALTAR solo para fixes triviales de 1-2 líneas

TechPlan → NUNCA saltar si el Coder va a escribir código significativo
         → SALTAR solo para correcciones de bugs pequeños conocidos

Coder    → Siempre necesario para materializar el código
```

### Regla concreta de este repo: ¿hace falta un spec-N?

"Parece pequeño" no es un criterio fiable — un fix de bug puede colar de rondón una decisión de diseño real. Usa esto en su lugar:

```
¿El cambio introduce algo que la usuaria ve por primera vez
(una UI nueva, un flujo nuevo) O hubo que elegir entre más de
un enfoque viable?
  → Sí → gánate un spec corto en docs/sdd/spec-N-nombre.md
          (medio folio basta: qué, por qué, qué se descartó y
          por qué — no hace falta el ceremonial completo)
  → No (bug con causa clara, ajuste acotado a un flujo
        existente, sin UI nueva) → fix directo, documentar en
        CHANGELOG.md/docs/TECHNICAL.md, sin spec
```

Ejemplo real de esta regla en acción (2026-08-30): el modal de "Escritura en Sheets" (PR #8) era UI nueva con una decisión real entre enfoques (modal propio vs. otras alternativas) y se implementó sin spec — la decisión y su porqué solo quedaron en la conversación, no en el repo. En cambio, el aviso de `file://`, que el modal no se cerrara al clic fuera, o sustituir un ID filtrado, sí eran bugs con causa clara y fue correcto ir directos al fix.

### Flujo completo paso a paso, cuando sí hace falta spec

```
0. Research (SOLO si hay incertidumbre real — territorio nuevo,
   no tienes claro qué existe ya)
   → leer código relevante, docs/TECHNICAL.md, README
   → si ya conoces el terreno, SALTAR directo al paso 1

1. Planner — el QUÉ y el POR QUÉ
   → qué se construye, para quién, criterios de aceptación
   → sin detalles técnicos todavía

2. TechPlan — el CÓMO
   → aquí es donde se LEE docs/TECHNICAL.md de verdad: qué
     patrones ya existen que se puedan reutilizar (p. ej. antes
     de construir un modal nuevo, mirar cómo están hechos los
     modales existentes), qué NO tocar
   → arquitectura técnica, lista de tareas numeradas
   → en specs pequeños esto se queda dentro del mismo
     spec-N.md; en uno grande, tech-plan-N.md aparte

3. Aprobar el plan con la usuaria (ExitPlanMode) → copiar a
   docs/sdd/spec-N-nombre.md

4. Rama nueva (nunca main directo) → implementar → tests si
   toca lib.js → verificar de verdad en el navegador

5. Actualizar documentación — aquí docs/TECHNICAL.md cumple el
   rol contrario al paso 0/2: ya no se LEE para informarse, se
   ACTUALIZA para reflejar el nuevo estado real (así el próximo
   Research, tuyo o de otra persona, parte de información
   correcta). README.md si cambió cómo se usa algo. CHANGELOG.md
   siempre.

6. Commits separados por tipo → push → PR → review → merge →
   sync (git pull) antes de la siguiente tarea
```

`docs/TECHNICAL.md` se toca dos veces con propósitos opuestos en este flujo: se *lee* en los pasos 0/2 para no reinventar algo que ya existe, y se *actualiza* en el paso 5 para que quede al día. Si se salta la actualización, el próximo Research parte de documentación desfasada.

---

## Las 4 fases — referencia rápida

### AIDevResearcher
**Propósito:** Investigar ANTES de planificar. ¿Qué existe? ¿Qué puedo reutilizar? ¿Qué necesito construir desde cero?

**Cuándo usarlo:**
- Territorio desconocido (tecnología nueva, dominio nuevo)
- Incertidumbre alta sobre la solución
- Antes de diseñar algo complejo

**Output:** `research.md` con hallazgos, reusables identificados y recomendaciones para el planner.

**Flujo interno:**
1. Recibe el brief inicial
2. Descompone en sub-preguntas de investigación
3. Investiga fuentes relevantes (repos, docs, best practices)
4. Consolida hallazgos
5. Identifica gaps y ambigüedades
6. Valida contigo si hay dudas críticas
7. Genera el handoff para el Planner

**Anti-patterns:**
- Investigar sin criterio de parada claro
- No documentar fuentes consultadas
- No generar handoff antes de pasar al Planner

---

### AIDevPlanner
**Propósito:** Definir QUÉ se construye y POR QUÉ. En lenguaje de negocio, sin tecnicismos.

**Cuándo usarlo:** Siempre antes de codificar funcionalidad real.

**Las 4 fases:**
```
1. Initialize  → lee el research, establece contexto
2. Interview   → te hace preguntas funcionales para clarificar
3. Specs       → genera especificaciones funcionales
4. Finalize    → plan.md finalizado + criterios de aceptación
```

**Output:** `plan.md` + `specs/spec-N.md` con criterios de aceptación en Gherkin.

**Criterios de aceptación (Gherkin):**
```gherkin
Escenario: [nombre descriptivo]
  Given [estado inicial / contexto]
  When  [acción del usuario]
  Then  [resultado esperado]
  And   [resultado adicional si aplica]
```

**Anti-patterns:**
- Incluir detalles técnicos en el plan
- Saltarse la fase de Interview
- Specs demasiado grandes (más de 8 tareas en el TechPlan → divide)

---

### AIDevTechPlan
**Propósito:** Definir CÓMO se implementa lo que planificó el Planner.

**Cuándo usarlo:** Siempre antes del Coder para funcionalidad significativa.

**Los 8 pasos:**
```
1. Lee plan.md
2. Analiza el código existente
3. Identifica componentes reutilizables
4. Diseña la arquitectura técnica
5. Define Verification Gates (tests requeridos)
6. Especifica dependencias
7. Genera tareas numeradas
8. Produce tech-plan.md
```

**Output:** `tech-plan-N.md` con tareas numeradas, priorizadas y dependencias claras.

**Verification Gates:** Por cada funcionalidad define qué tests deben pasar antes de dar por buena la implementación.

**Anti-patterns:**
- Más de 8-10 tareas → divide el spec
- TechPlan sin referencia al spec de plan.md
- No definir Verification Gates

---

### AIDevCoder
**Propósito:** Implementar el código según el tech-plan. Nada más.

**El ciclo:**
```
1. CODE     → implementa según tech-plan.md
2. SECURITY → revisa vulnerabilidades, inputs, secrets
3. TESTS    → escribe tests que cubran los Verification Gates
```

**Lo que NO hace (y tú sí):**
- No hace git add / commit / push
- No crea branches
- No despliega
- Tú revisas, testeas y haces el commit

**Anti-patterns:**
- Lanzarlo sin un tech-plan
- Dejarle hacer commits automáticos → di siempre NO
- No revisar el código antes de subir

---

## Dimensionamiento de specs

El tamaño correcto de un spec se mide por las tareas que genera en el TechPlan:

| Tamaño | Tareas en TechPlan | Tiempo estimado | Acción |
|--------|-------------------|-----------------|--------|
| Pequeño | 1-5 tareas | Medio día / 1 día | ✅ OK |
| Medio | 6-8 tareas | 1-2 días | ✅ OK |
| Grande | 9+ tareas | 3+ días | ⚠️ Dividir en 2 specs |

**Señales de que hay que dividir:**
- El "¿qué hace esto?" tiene dos respuestas distintas
- Toca más de 2 módulos o áreas independientes
- La primera parte se puede entregar sin la segunda
- El TechPlan tiene más de 8 tareas

---

## Estructura de archivos recomendada

```
~/mi-proyecto/
├── runtimes/
│   └── root/
│       ├── mi-app.html          → código principal
│       ├── tests/
│       │   └── test_mi_app.py   → suite de tests Playwright
│       └── docs/
│           ├── TECHNICAL.md     → arquitectura técnica
│           ├── README.md        → descripción y changelog
│           └── sdd/             → specs y tech-plans
│               ├── spec-1-*.md
│               ├── tech-plan-1-*.md
│               └── plan.md
└── .aicontext/
    └── deliverables/
        └── sdd/                 → outputs de las fases
            ├── plan.md
            └── specs/
```

En este proyecto (`gestor-financiero`, single-file HTML sin build) no hace falta replicar esta estructura al pie de la letra — `lib.js` ya hace de "código puro testeable" y `tests.html` de suite de tests. Los planes/specs que merezcan quedar documentados se guardan en `docs/sdd/spec-N-nombre-corto.md` (numerado, incremental — nunca se sobrescribe el anterior: los specs son la memoria del proyecto, no un archivo de trabajo temporal) — no en `.aicontext/`, y no solo en el archivo local de modo Plan de Claude Code (`~/.claude/plans/`, que no se sincroniza por git y el resto del equipo no vería). Antes de numerar uno nuevo, mira qué `spec-N` es el más alto en `docs/sdd/` y usa el siguiente.

---

## Cómo estructurar un prompt de agente

### Prompt de AIDevPlanner

```
Lee el research (si existe):
/ruta/absoluta/research.md

Y el código actual (si existe):
/ruta/absoluta/mi-app.html

Quiero añadir [funcionalidad X].

CONTEXTO:
[Descripción breve del proyecto y el usuario]

FUNCIONALIDAD:
[Descripción de lo que quieres construir]

Genera spec-N-nombre.md en:
/ruta/absoluta/.aicontext/deliverables/sdd/specs/

Añade ## Referencias al final enlazando a [[plan]].
```

### Prompt de AIDevTechPlan

```
Lee el spec:
/ruta/absoluta/.aicontext/deliverables/sdd/specs/spec-N-nombre.md

Y el código actual:
/ruta/absoluta/mi-app.html

Genera el plan técnico de implementación para spec-N.

Presta especial atención a:
- [patrones importantes a respetar]
- [claves de localStorage a usar]
- [módulos que no deben tocarse]

Guarda en:
/ruta/absoluta/.aicontext/deliverables/sdd/specs/tech-plan-N-nombre.md
```

### Prompt de AIDevCoder

```
Lee el plan técnico:
/ruta/absoluta/.aicontext/deliverables/sdd/specs/tech-plan-N-nombre.md

Y el código actual:
/ruta/absoluta/mi-app.html

Y la suite de tests:
/ruta/absoluta/tests/test_mi_app.py

Implementa [funcionalidad X] siguiendo exactamente el plan técnico.

CRÍTICO:
- [restricciones importantes]
- [qué NO tocar]

Verifica con la suite de tests al terminar.
Añade tests para la nueva funcionalidad.
```

---

## Reglas de oro

```
1. SESIÓN NUEVA por cada agente
   → El contexto de cada agente es limpio

2. RUTAS ABSOLUTAS siempre
   → ruta completa, no atajos relativos, en los prompts

3. PASAR la ruta del output anterior
   → El Planner lee el research, el Coder lee el TechPlan

4. DECIR explícitamente qué NO tocar
   → "No toques el módulo X ni el archivo Y"

5. DI NO al commit automático del agente
   → Tú controlas cuándo y qué subes a GitHub

6. SKIP a comandos de navegador del agente
   → El localStorage del agente no es el tuyo

7. PROBAR en el navegador antes de subir
   → Abrir en incógnito para tests sin caché

8. TESTS siempre
   → La suite de tests es tu red de seguridad
   → Ejecutar después de cada cambio significativo
```

---

## Tests con Playwright

La suite de tests automatizados es la red de seguridad del proyecto. Se ejecuta después de cada implementación del Coder.

En este proyecto la suite equivalente es `tests.html` (sin Playwright, sin dependencias) — ábrelo en el navegador tras cada cambio en `lib.js` y comprueba que sigue en verde, tal y como dice el README.

### Estructura básica (referencia general, otros proyectos con Playwright)

```python
from playwright.sync_api import sync_playwright
import subprocess, json, time

def test_mi_funcionalidad(page, base_url):
    page.goto(base_url)

    # Inyectar datos de prueba
    page.evaluate("""() => {
        localStorage.setItem('mi_clave', JSON.stringify([{...}]));
    }""")
    page.reload()

    # Verificar comportamiento
    assert page.locator('#mi-elemento').is_visible()

    # Limpiar
    page.evaluate("() => localStorage.clear()")
```

### Ejecución

```bash
cd ~/mi-proyecto/runtimes/root
python3 tests/test_mi_app.py 2>&1 | tail -10
```

### Convenciones de naming

```python
# Secciones numeradas
# SECCION 1 — Nombre de la sección
# SECCION 2 — Otra sección

# Tests numerados dentro de cada sección
# 1.1 descripción del test
# 1.2 descripción del test
# 2.1 descripción del test
```

---

## Gestión de localStorage

Para apps single-file HTML, localStorage es tu base de datos. Convenciones:

```javascript
// Naming convention
nombreapp_modulo_items    // lista de items
nombreapp_modulo_config   // configuración del módulo
nombreapp_backup_timestamp // marca de tiempo del último backup

// Ejemplos
agile_impedimentos_items
agile_health_status
finops_optimization_items
finops_custom_csps
```

**Reglas:**
- Nunca cambiar el nombre de una clave en producción (rompe datos existentes)
- Siempre incluir en backup global export/import
- Documentar en TECHNICAL.md (en este repo: en el README, sección "Estructura de datos")

---

## ThemeManager (modo oscuro/claro)

Para apps con soporte de tema claro/oscuro:

```javascript
// En CSS — siempre usar variables, nunca colores hardcodeados
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-accent: #0ea5e9;  /* sky-500 */
}

[data-theme="dark"] {
  --color-bg: #121212;
  --color-text: #e0e0e0;
  --color-accent: #38bdf8;
}

// En JS — detectar preferencia del sistema
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

---

## Backup y control de versiones

### Git — commits semánticos

```bash
feat: v1.x.y - descripción de la funcionalidad
fix: descripción del bug corregido
docs: descripción de la documentación
refactor: descripción de la limpieza de código
```

### Backup de datos (localStorage → JSON)

Siempre implementar export/import en la app:

```javascript
// Export
function exportarBackup() {
    const data = {
        items: JSON.parse(localStorage.getItem('app_items') || '[]'),
        config: JSON.parse(localStorage.getItem('app_config') || '{}'),
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    // download...
}
```

---

## Qué documentar (README / doc técnica)

Actualizar después de cada sprint:

```markdown
## 1. Arquitectura
- Descripción general de la app
- Patrón de módulos (IIFEs, stores, etc.)

## 2. Claves localStorage
| Clave | Contenido | Backup |
|-------|-----------|--------|
| app_items | Lista de items | Sí |

## 3. Módulos principales
### NombreStore
- Responsabilidad: ...
- API pública: getAll(), save(), remove()
- Clave: app_nombre_items

## 4. Suite de tests
- Cobertura actual: X/X tests
- Cómo ejecutar: python3 tests/test_app.py
```

---

## Cuándo usar cada fase — árbol de decisión

```
¿Es un cambio de 1-2 líneas?
  → Sí → directo, sin flujo SDD
  → No ↓

¿Hay incertidumbre sobre qué construir?
  → Sí → Researcher → Planner → TechPlan → Coder
  → No ↓

¿Tienes claro el QUÉ pero no el CÓMO técnico?
  → Sí → Planner → TechPlan → Coder
  → No ↓

¿Tienes spec y plan técnico listos?
  → Sí → Coder directo
  → No → Vuelve al Planner
```

---

## Flujo de trabajo diario

```
1. Abre el proyecto en tu editor

2. Decide qué spec implementar hoy
   → Revisa plan.md, elige el siguiente spec

3. Si no hay spec → fase Planner primero
   → Nunca al Coder sin spec

4. Fase TechPlan con el spec
   → Sesión nueva, pasa la ruta del spec

5. Fase Coder con el tech-plan
   → Sesión nueva, pasa la ruta del tech-plan

6. Ejecuta los tests (tests.html en este proyecto)

7. Prueba en el navegador (incógnito)
   → Verifica UX y comportamiento real

8. Commit y push si todo OK (en este repo: rama + Pull Request)

9. Documenta si hay cambios de arquitectura
   → Actualiza el README (y el CHANGELOG.md)
```

---

## Anti-patterns más comunes

- Lanzar el Coder sin TechPlan
  → El código será impredecible y difícil de mantener

- Un spec gigante con 15+ tareas
  → Divide en specs más pequeños, entrégalos uno a uno

- No ejecutar los tests después del Coder
  → Podrías estar rompiendo funcionalidad existente

- Dejar que el agente haga commits
  → Siempre di NO, controla tú el historial de Git

- Colores hardcodeados en CSS
  → Siempre usar variables CSS para soporte de temas

- Cambiar el nombre de claves de localStorage
  → Rompe los datos de usuarios existentes

- No documentar decisiones técnicas
  → En 3 meses no recordarás por qué hiciste algo así

- Usar el chat para todo sin estructura
  → Funciona para exploración, no para producción

---

## Checklist antes de hacer push

- [ ] Los tests pasan (X/X PASSED, 0 FAILED)
- [ ] He probado en el navegador en incógnito
- [ ] El modo oscuro/claro funciona correctamente
- [ ] El export/import de backup funciona
- [ ] La documentación está actualizada si hay cambios de arquitectura
- [ ] El README/CHANGELOG tiene la entrada correspondiente
- [ ] El commit message sigue el formato semántico
- [ ] No hay claves de API ni secrets en el código

---

## Recursos

- **Tests:** Playwright para verificación E2E de apps HTML (en este repo: `tests.html` manual sobre `lib.js`)
- **Temas:** ThemeManager con CSS custom properties
- **Persistencia:** localStorage + export/import JSON
