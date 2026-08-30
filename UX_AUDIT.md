# Auditoría UX/UI — Gestor Financiero

Análisis de la aplicación de cara a un producto que se pueda monetizar, no solo un uso personal. Hecho contra la app real (capturas de pantalla en Chrome headless, tema claro/oscuro, escritorio y móvil de 390px), no solo leyendo el código — varios de los hallazgos de abajo solo se ven así.

## Metodología

1. Captura de pantalla de la landing, del dashboard con datos de ejemplo, en claro/oscuro y en móvil.
2. Medición objetiva de contraste de color (fórmula de luminancia relativa WCAG 2.1) para cada par texto/fondo de la paleta, no solo "a ojo".
3. Comprobación de overflow horizontal real (`scrollWidth` vs `clientWidth`) en viewport móvil.
4. Cada hallazgo se verificó reproducido antes de arreglarlo, y se volvió a capturar/medir después del arreglo para confirmar que desapareció.

## Hallazgos corregidos

### 1. Bug — los botones de cabecera se veían en la pantalla de inicio (antes de tener datos)
**Causa**: `.hactions{display:flex}` tiene la misma especificidad CSS que la regla `[hidden]{display:none}` del navegador, y al ir después en la cascada, ganaba — el atributo `hidden` dejaba de tener efecto visual aunque el elemento siguiera "hidden" en el DOM.
**Por qué importa**: aparte de la mala primera impresión, abría rutas rotas de verdad — pulsar "Añadir movimiento" antes de tener una pestaña activa guardaba el movimiento en un limbo que se perdía al recargar.
**Arreglo**: `.hactions[hidden]{display:none}` (specificity 0-2-0, gana a la regla base).

### 2. Bug — los botones de cabecera se desbordaban en móvil (390px)
**Causa**: `.hactions .btn{flex:1}` intentaba repartir 5 botones en una sola fila; el texto de botones como "Desde Google Sheets" no podía encoger más allá de su ancho de contenido, así que la fila se salía del viewport en vez de bajar de línea.
**Arreglo**: en móvil, los botones pasan a apilarse a ancho completo (`flex:1 1 100%`), un patrón táctil habitual y sin riesgo de desbordamiento sea cual sea la longitud del texto. Verificado con `scrollWidth === clientWidth` tras el cambio (antes no lo eran).

### 3. Accesibilidad — contraste de color insuficiente (WCAG AA)
Medido, no estimado. El mínimo AA para texto normal es 4.5:1.

| Color | Antes | Después |
|---|---|---|
| `--faint` oscuro sobre fondo | 3.56:1 ❌ | 5.10:1 ✅ |
| `--faint` oscuro sobre panel | 3.29:1 ❌ | 4.70:1 ✅ |
| `--faint` claro sobre fondo | 2.94:1 ❌ | 4.97:1 ✅ |
| `--faint` claro sobre panel | 3.18:1 ❌ | 5.37:1 ✅ |
| `--income` claro sobre fondo | 3.49:1 ❌ | 5.08:1 ✅ |
| `--expense` claro sobre fondo | 4.35:1 ❌ (por poco) | 4.95:1 ✅ |
| Texto de botón primario sobre morado (claro) | 4.13:1 ❌ | 4.61:1 ✅ |

`--faint` se usa muchísimo (porcentajes, contadores, fechas en tarjetas móviles, subtítulos) — era el fallo con más superficie de impacto real para personas con baja visión.

### 4. Layout — hueco vacío en el panel "Fijo vs Variable"
Con solo 2 tarjetas (Fijo/Variable, sin "Sin clasificar"), la rejilla de 3 columnas fijas dejaba un tercio de la fila vacío. Cambiado a `repeat(auto-fit,minmax(160px,1fr))`: las tarjetas existentes se reparten el espacio disponible, sin huecos, y sigue funcionando igual de bien si aparecen 3.

### 5. Jerarquía visual — acción destructiva con el mismo peso que el resto
"Borrar movimientos" tenía el mismo estilo que "Añadir extracto" o "Desde Google Sheets". Ahora usa un tono más apagado por defecto y solo se tiñe de rojo de aviso al pasar el ratón — sigue siendo accesible sin gritar "peligro" constantemente ni confundirse con la acción principal (morada).

### 6. Información arquitectura — cabecera con demasiadas acciones de igual peso
5 botones sueltos (Añadir extracto / Desde Google Sheets / Escritura Sheets / Añadir movimiento / Borrar movimientos), todos con el mismo peso visual, sin agrupar por frecuencia de uso ni propósito.
**Arreglo**: dos menús desplegables reales (con `role="menu"`/`role="menuitem"`, `aria-haspopup`, `aria-expanded`, cierre con Escape y al hacer clic fuera):
- **Importar ▾**: agrupa "Desde archivo (Excel/CSV)" y "Desde Google Sheets" — misma intención (traer datos), un solo punto de entrada.
- **⚙ ▾**: agrupa "Escritura en Sheets" (configuración, uso puntual) y "Borrar movimientos" (destructivo, con el tono atenuado del hallazgo 5).

De paso corregido un bug del propio menú antes de darlo por bueno: el desplegable de ajustes, al estar pegado al borde derecho, se abría alineado a la izquierda y se cortaba fuera de la pantalla — se abre ahora alineado a la derecha (`.dropdown.right`). En móvil, la cabecera pasa de 5 filas apiladas a 3, sin overflow horizontal (verificado con `scrollWidth === clientWidth`).

## Tests añadidos

`tests.html` incluye una batería de contraste WCAG automatizada (14 comprobaciones sobre los pares de color de cada tema) — si alguien cambia un color de la paleta en el futuro y baja de 4.5:1, los tests lo detectan solos en vez de necesitar otra ronda de capturas de pantalla. Total: **78/78 tests en verde** (57 de lógica + 14 de contraste + 7 de licencia Pro añadidos en paralelo por otro colaborador).

## Pendiente — recomendado pero no aplicado en esta pasada

No todo lo que encontré se ha tocado; esto es lo que dejo documentado para decidir con calma, no bugs silenciados:

- **Tamaño de objetivos táctiles**: los botones rondan 32-36px de alto; la recomendación de Apple/Material es 44-48px para dedos. Agrandar todos los botones de golpe es un cambio de densidad visual en todo el sistema, mejor decidirlo con la usuaria antes que aplicarlo a ciegas.
- **Iconos de emoji** (🌙/☀️ para el tema, 🔗/📄/📊/🗑 en los menús) — funcionan y ya dan alguna pista visual extra dentro de los desplegables, pero un set de iconos SVG consistente daría un acabado más "producto terminado" si el objetivo final es venderlo.
- **Affordance de edición poco visible**: el campo de concepto es editable (`contenteditable`) pero no hay ninguna pista visual (icono de lápiz, subrayado) hasta que pasas el ratón por encima — quien no lo sepa de antemano puede no descubrirlo nunca.

## Archivos tocados

`index.html` (CSS, HTML y JS de los desplegables), `tests.html` (14 tests de contraste, fusionados con los 7 de licencia Pro de `RintungEn1gma`). Sin cambios en `lib.js` en esta auditoría — todo era visual/interacción, no lógica de negocio.
