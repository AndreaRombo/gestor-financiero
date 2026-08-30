# Documentación técnica — Gestor Financiero

Arquitectura, decisiones técnicas y funcionamiento interno. Para qué hace la app y cómo usarla, ver el [README](../README.md). Para el historial de cambios, ver el [CHANGELOG](../CHANGELOG.md).

## Arquitectura general

Todo el código —HTML, CSS y JavaScript— vive en dos archivos:

- **`index.html`**: interfaz, estilos, y toda la lógica que depende del DOM o hace I/O (render, gestión de pestañas, parseo de archivos, lectura/escritura de Google Sheets).
- **`lib.js`**: lógica pura sin DOM (parseo de fechas/importes, categorización automática, CSV, extracción de datos de enlaces de Sheets). Es lo único del proyecto con tests automáticos (`tests.html`).

**Por qué esta separación:** es la única forma de tener tests automáticos en una app sin build ni framework — cualquier función que no dependa del DOM se puede probar en aislamiento abriendo `tests.html` en un navegador. Si una función nueva no necesita `document`/`window`, va en `lib.js`, no en `index.html`.

No hay build, no hay bundler, no hay backend propio, no hay base de datos. `index.html` se sirve tal cual desde GitHub Pages.

## Persistencia de datos

Todo vive en `localStorage` del navegador, bajo tres claves con el prefijo `fin:`:

| Clave | Contenido |
|---|---|
| `fin:v2` | Datos de la app: todas las pestañas (boards), sus movimientos y categorías personalizadas |
| `fin:theme` | Preferencia de tema claro/oscuro |
| `fin:sheetlink` | Último enlace de Google Sheets conectado (para poder "actualizar" sin volver a pegarlo) |
| `fin:writeurl` / `fin:writesecret` | URL del Apps Script Web App y el código secreto, si se activó la escritura de vuelta a Sheets |

**Regla dura: nunca se cambia el nombre de una clave existente en producción** — rompe los datos ya guardados de cualquier usuaria. Si hace falta cambiar la forma de los datos, se versiona dentro del propio objeto guardado (como ya pasó: `fin:v2` reemplazó a un formato anterior sin versión, con lectura retrocompatible en `load()`).

### Estructura de los datos

- **Pestaña / board**: `{ id, name, fileName, rows, customCats, active, sort }` — cada pestaña es un tracker independiente (piensa en ello como hojas de un Excel).
- **Movimiento / row**: `{ id, fecha, concepto, importe, categoria, manual, añadido, src? }`. `importe` negativo = gasto, positivo = ingreso. `src` (`{ gid, row, catCol, fjCol, cCol }`) solo existe si la fila vino de una hoja de Google Sheets importada, y es lo que permite escribir cambios de vuelta a la celda original.
- **Categoría**: `BASE_CATS` (built-in, en `index.html`) + `customCats` por pestaña, cada una `{ label, color, tipo }` donde `tipo` es `"fijo"` o `"variable"`.

El patrón de estado en tiempo de ejecución (`rows`, `boards`, `currentBoardId` como variables globales, sincronizadas a/desde el board activo con `syncBoard()`/`loadBoardData()` en cada cambio de pestaña) es manual pero deliberado: no hay framework de por medio, y reescribirlo a algo más "formal" (store centralizado, etc.) no está justificado sin un bug concreto que lo motive — ver decisión documentada en `docs/sdd/plan.md` del pase de mantenimiento del 2026-08-30.

## Importación de archivos

`index.html` implementa sus propios parsers, sin depender de una librería para el caso común:

- **`.xlsx`/`.xlsm`**: `xlsxToMatrix()` descomprime el ZIP a mano (`unzip()` + `DecompressionStream("deflate-raw")`, sin librería) y parsea el XML de la hoja (`sharedStrings.xml`, `styles.xml` para detectar qué celdas son fechas, `sheet1.xml`).
- **`.xls`**: la mayoría de bancos exportan un `.xls` que en realidad es una tabla HTML (`xlsToMatrix()` lo detecta por sniffing y usa `DOMParser`). Para un `.xls` binario real, cae a [SheetJS](https://cdnjs.cloudflare.com/ajax/libs/xlsx/) vía CDN — es la única dependencia externa de JS del proyecto.
- **CSV**: `csvToMatrix()`/`splitLine()` en `lib.js`, soporta comillas escapadas y separador `,`/`;`/tab.

Detección de columnas (`ingestMatrix()`): busca cabeceras por texto (fecha/concepto/importe, y opcionalmente categoría/fijo-variable) entre las primeras 15 filas; si no encuentra cabecera reconocible, `guessColumns()` (en `lib.js`) intenta detectar las columnas por contenido (qué columna parsea como fecha, cuál como importe, cuál tiene más texto = concepto).

## Integración con Google Sheets

**Lectura** (`importFromDrive()`): sin OAuth ni Picker (se probaron ambos en versiones anteriores, ver `CHANGELOG.md` — se abandonaron por fricción de login). El flujo actual:

1. `extractSheetInfo()` (`lib.js`) extrae el ID de la hoja del enlace pegado — **solo reconoce URLs con `/spreadsheets/d/`** (Hojas de Cálculo de Google nativas). Un enlace de un Excel subido a Drive sin convertir (`drive.google.com/file/d/...`) no matchea y se rechaza. Es una limitación conocida, no un bug — ver Limitaciones en el README.
2. `driveDiscoverTabs()` intenta leer todas las pestañas de la hoja haciendo `fetch` a la página de edición pública y buscando un patrón en su HTML interno — técnica no oficial, puede romperse si Google cambia el marcado. Si falla (o CORS lo bloquea), cae a importar solo la pestaña del `gid` del enlace pegado.
3. Cada pestaña se descarga como CSV vía el endpoint público `gviz/tq?tqx=out:csv&gid=...` (si la hoja no es pública, devuelve una página de login HTML en vez de CSV, detectado y tratado como fallo para esa pestaña).

**Escritura** (`writeBackCell()` + `writeBackCategoryChange()`): un Google Apps Script Web App propio (código en el README, lo despliega cada usuaria en su cuenta) recibe `POST` con `{gid, row, col, value, secret}` y solo escribe si el `secret` coincide — sin esto, la URL pública del script no basta para escribir nada. El `fetch` usa `mode:"no-cors"` (respuesta opaca, no se puede leer el resultado; el Apps Script no depende de CORS para escribir).

## Seguridad

- **XSS**: todo texto que viene de fuera (concepto, categoría importada, nombre de pestaña) pasa por `esc()` (usa `textContent`/`innerHTML` de un `div` invisible) antes de insertarse en el DOM.
- **Escritura a Sheets protegida por secreto**: ver arriba — la URL del Apps Script por sí sola no permite escribir.
- **Sin credenciales de Google**: la lectura usa un enlace público de solo lectura; la escritura usa el Apps Script autorizado por la propia usuaria. No hay tokens OAuth ni contraseñas en el código ni en el repositorio.
- **URLs siempre construidas por la app**: los IDs de Sheets/Drive se validan por regex (solo alfanumérico y guiones) antes de construir cualquier URL — nunca se hace `fetch` directo a una URL pegada tal cual por la usuaria.

## Testing

`tests.html` — sin framework, ~74 aserciones sobre `lib.js` (parseo de fechas/importes/CSV, categorización automática, extracción de datos de Sheets) más una batería de contraste de color WCAG AA que protege la paleta de `index.html` (ver `UX_AUDIT.md` para la metodología completa de la auditoría de accesibilidad).

Lo que **no** tiene test automático: todo lo que vive en `index.html` (render, gestión de pestañas, formularios, integración con Sheets) — se verifica a mano en el navegador. No hay Playwright ni ningún test end-to-end en este repo.

## Librerías externas

- [SheetJS (xlsx)](https://cdnjs.cloudflare.com/ajax/libs/xlsx/) vía CDN — solo para `.xls` binarios reales (el caso HTML-disfrazado-de-xls no la usa).
- Google Fonts (Space Grotesk, Inter, JetBrains Mono).

Sin más dependencias — sin npm, sin `package.json`, sin build.

## Decisiones técnicas notables (con su porqué)

- **Single-file HTML sin framework/build**: la app se sirve gratis desde GitHub Pages con cero infraestructura, y cualquier colaboradora puede probarla con doble clic sin instalar nada. El coste es que todo el JS de UI vive en un único `<script>` de ~1300 líneas — aceptable mientras el equipo sea pequeño (ver más abajo el límite de esto).
- **Google Sheets por enlace compartido, no OAuth**: mucha menos fricción para la usuaria (no hay pantallas de "app no verificada" de Google), a cambio de depender de una técnica no oficial para descubrir pestañas (frágil si Google cambia su HTML interno) y de necesitar que la hoja esté compartida públicamente para lectura.
- **Escritura vía Apps Script propio en vez de API de Sheets con OAuth**: cada usuaria autoriza su propio script una sola vez sobre su propia hoja; la app nunca gestiona tokens de nadie.
- **Código de licencia Pro (Gumroad) eliminado** (2026-08-30): existió en `lib.js` sin ninguna UI conectada — código muerto. Si se retoma la monetización, se recupera del historial de git como base de un spec nuevo, con su UI diseñada desde cero en vez de heredar una implementación a medias.
