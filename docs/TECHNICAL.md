# Documentación técnica — Gestor Financiero

Arquitectura, decisiones técnicas y funcionamiento interno. Para qué hace la app y cómo usarla, ver el [README](../README.md). Para el historial de cambios, ver el [CHANGELOG](../CHANGELOG.md).

## Arquitectura general

Todo el código —HTML, CSS y JavaScript— vive en dos archivos:

- **`index.html`**: interfaz, estilos, y toda la lógica que depende del DOM o hace I/O (render, gestión de pestañas, parseo de archivos, lectura/escritura de Google Sheets).
- **`lib.js`**: lógica pura sin DOM (parseo de fechas/importes, categorización automática, CSV, extracción de datos de enlaces de Sheets). Es lo único del proyecto con tests automáticos (`tests.html`).

**Por qué esta separación:** es la única forma de tener tests automáticos en una app sin build ni framework — cualquier función que no dependa del DOM se puede probar en aislamiento abriendo `tests.html` en un navegador. Si una función nueva no necesita `document`/`window`, va en `lib.js`, no en `index.html`.

No hay build, no hay bundler, no hay backend propio, no hay base de datos. `index.html` se sirve tal cual desde GitHub Pages.

## Persistencia de datos

Todo vive en `localStorage` del navegador, bajo claves con el prefijo `fin:`:

| Clave | Contenido |
|---|---|
| `fin:v2` | Datos de la app: todas las pestañas (boards), sus movimientos y categorías personalizadas |
| `fin:theme` | Preferencia de tema claro/oscuro |
| `fin:sheetlink` | Último enlace de Google Sheets conectado (para poder "actualizar" sin volver a pegarlo) |
| `fin:writeurl` / `fin:writesecret` | URL del Apps Script Web App y el código secreto, si se activó la escritura de vuelta a Sheets |
| `fin:sheettabs` | Última lista de pestañas (`gid`+nombre) descubiertas con éxito en la hoja conectada — red de seguridad si el descubrimiento automático falla en algún dispositivo (ver más abajo) |

**Regla dura: nunca se cambia el nombre de una clave existente en producción** — rompe los datos ya guardados de cualquier usuaria. Si hace falta cambiar la forma de los datos, se versiona dentro del propio objeto guardado (como ya pasó: `fin:v2` reemplazó a un formato anterior sin versión, con lectura retrocompatible en `load()`).

### Estructura de los datos

- **Pestaña / board**: `{ id, name, fileName, rows, customCats, active, sort }` — cada pestaña es un tracker independiente (piensa en ello como hojas de un Excel).
- **Movimiento / row**: `{ id, fecha, concepto, importe, categoria, manual, añadido, src? }`. `importe` negativo = gasto, positivo = ingreso. `src` (`{ gid, row, catCol, fjCol, cCol }`) solo existe si la fila vino de una hoja de Google Sheets importada, y es lo que permite escribir cambios de vuelta a la celda original.
- **Categoría**: `BASE_CATS` (built-in, en `index.html`) + `customCats` por pestaña, cada una `{ label, color, tipo }` donde `tipo` es `"fijo"` o `"variable"`.

El patrón de estado en tiempo de ejecución (`rows`, `boards`, `currentBoardId` como variables globales, sincronizadas a/desde el board activo con `syncBoard()`/`loadBoardData()` en cada cambio de pestaña) es manual pero deliberado: no hay framework de por medio, y reescribirlo a algo más "formal" (store centralizado, etc.) no está justificado sin un bug concreto que lo motive — ver decisión documentada en [`docs/sdd/spec-1-mantenimiento-refactor-tests.md`](sdd/spec-1-mantenimiento-refactor-tests.md).

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

**CORS y `file://`:** verificado con `curl` (con el header `Origin: https://andrearombo.github.io`) que Google permite estas peticiones desde el origen real de la app publicada — no hay que hacer nada especial en producción. Pero **abrir `index.html` directamente desde disco no funciona**: el navegador manda `Origin: null` en ese caso, y Google no lo permite, así que tanto `driveDiscoverTabs()` como el `fetch` del CSV fallan con "Failed to fetch" para todas las pestañas. `importFromDrive()` detecta `location.protocol==="file:"` al principio y avisa con un mensaje específico en vez de dejar que falle en silencio con el genérico "no se pudo leer la hoja". Para probar esta función en local hace falta servir la carpeta por `http://` (ver README, sección Desarrollo).

**Escritura de una celda existente** (`writeBackCell()` + `writeBackCategoryChange()`): un Google Apps Script Web App propio (código en el README, lo despliega cada usuaria en su cuenta) recibe `POST` con `{action:"setCell", gid, row, col, value, secret}` y solo escribe si el `secret` coincide — sin esto, la URL pública del script no basta para escribir nada. El `fetch` **intenta primero una petición normal** (sin `no-cors`) para poder leer la respuesta JSON real (`{ok:true}` o `{error:"..."}`) y mostrarla al usuario vía `reportWriteResult()`; si esa petición falla por CORS u otro motivo de red, cae a una segunda petición con `mode:"no-cors"` como red de seguridad (dispara el cambio igualmente, pero sin poder confirmar el resultado — se avisa de eso también). Validado con un servidor HTTP local que imita las cuatro respuestas del Apps Script (éxito, secreto incorrecto, fuera de rango, hoja no encontrada) más el caso de servidor inalcanzable.

**Escritura de una fila nueva** (`appendRowToSheet()` + `writeAppendRow()`, ver spec [docs/sdd/spec-2-anadir-movimiento-escribe-fila-nueva-en-sheets.md](sdd/spec-2-anadir-movimiento-escribe-fila-nueva-en-sheets.md)): cuando se añade un movimiento a mano (`addManual()`) en una pestaña que vino de Sheets, `findSheetLink()` busca la primera fila de `rows` que tenga `.src` (cualquier fila importada de esa pestaña sirve de plantilla — todas comparten `gid` y columnas) y usa su `gid`/`catCol`/`fjCol`/`cCol`/`fCol`/`aCol` para saber a qué hoja y qué columnas escribir. Si no hay ninguna fila con `.src` (pestaña no vinculada a Sheets, o Excel local), `findSheetLink()` devuelve `null` y no se intenta nada — sin aviso, es el comportamiento normal para esas pestañas. Solo se rellenan las columnas que existan en el origen (una pestaña sin columna de Categoría, p. ej., no la incluye en el `values` enviado). El Apps Script decide la fila con `Sheet.appendRow()` en vez de recibir un número de fila del cliente, para evitar colisiones si la hoja cambió desde la última importación — esto requiere una acción nueva (`action:"appendRow"`) que el script ya desplegado por la usuaria **no tiene**; el código del README se actualizó y hay que redesplegar una versión nueva. `row.src` ahora guarda también `fCol` (columna de fecha) y `aCol` (columna de importe), añadidas en `ingestMatrix()` junto a las columnas que ya se guardaban.

**Configuración de la escritura** (`openWriteModal()`/`saveWriteUrl()`, modal `#writeOverlay`): pide la URL y, si es válida, muestra el secreto con un botón de copiar. Antes esto eran dos `prompt()` nativos encadenados — se cambió a un modal propio porque los navegadores pueden bloquear en silencio los `prompt()` repetidos en la misma página (sin avisar, sin lanzar error: simplemente no se muestran), lo que hacía parecer que el segundo popup "desaparecía". Un modal en la propia página no depende de los diálogos nativos del navegador y no tiene ese problema.

**Configuración portátil entre dispositivos y auto-sincronización** (ver spec [docs/sdd/spec-3-config-portatil-y-auto-sync.md](sdd/spec-3-config-portatil-y-auto-sync.md)): antes de esto, `fin:sheetlink`/`fin:writeurl`/`fin:writesecret` vivían solo en el `localStorage` del navegador donde se configuraron — pasar de ordenador a móvil obligaba a rehacer todo. Ahora:

- `buildShareLink()` codifica `{s: fin:sheetlink, w: fin:writeurl, k: fin:writesecret, t: <pestañas conocidas>}` en base64 dentro de `location.hash` (`#cfg=...`) y genera un enlace único (`writeStep2` del modal de escritura, campo "Enlace para configurar otro dispositivo"). Se usa `location.hash` en vez de query string para que no viaje en peticiones de servidor y se pueda limpiar de la URL visible con `history.replaceState()`.
- `applyConfigLink()` corre al principio del arranque, **antes** de `load()`: si hay un `#cfg=...` en la URL, decodifica el JSON, guarda las tres claves en `localStorage` (y las pestañas conocidas si vienen, vía `saveKnownTabs()`), limpia el hash de la URL (para que el secreto no quede en la barra de direcciones) y avisa con un banner. Un enlace corrupto no rompe el arranque — solo avisa con un banner de error y sigue.
- **Pestañas conocidas** (`getKnownTabs()`/`saveKnownTabs()`, `localStorage` key `fin:sheettabs`, formato `{id: <sheet id>, tabs: [{gid, name}, ...]}`): `driveDiscoverTabs()` es scraping no oficial y puede fallar de forma distinta según el dispositivo/navegador (confirmado: en un móvil real, la petición al HTML de edición fallaba silenciosamente mientras que en el ordenador funcionaba, dejando el móvil con una única pestaña genérica "Google Sheets" en vez de las pestañas reales). Cada sincronización que descubre pestañas con éxito (`syncSheetTabs()`) guarda esa lista real (`gid`+nombre) en `fin:sheettabs`, keyed al ID de la hoja. Si `driveDiscoverTabs()` devuelve vacío (falla), `syncSheetTabs()` cae a esa lista guardada en vez del genérico `[{gid: <el de la URL pegada>, title:null}]` de antes — y como esa lista viaja también dentro del enlace de configuración (`buildShareLink()`/`applyConfigLink()`), un dispositivo nuevo configurado por enlace ya arranca con las pestañas reales conocidas, sin depender de que el scraping funcione ahí para tener un primer resultado razonable.
- `autoSyncOnOpen()` corre al final del arranque, después de `load()`+`show()`: si hay una hoja conectada (`fin:sheetlink`), sincroniza en segundo plano sin diálogos ni overlay de carga (`syncSheetTabs(link, true)`, modo silencioso — reutiliza la misma lógica que `importFromDrive()`, extraída a una función compartida). Solo muestra un aviso si se añadió al menos un movimiento nuevo; si no hay novedades, no hay banner (para no ser ruidoso cada vez que se abre la app); si falla (sin conexión, hoja no accesible), falla en silencio — abrir la app sin cobertura no debe interrumpir con un error. Vuelve a dejar visible la pestaña en la que estaba la usuaria antes de sincronizar, aunque internamente haya tenido que cambiar de pestaña para actualizar cada una.
- `ingestMatrix()` acepta ahora un parámetro `silent` (omite su propio `banner()` de "X movimientos añadidos") y devuelve el número de movimientos añadidos, para que `syncSheetTabs()` pueda sumar el total de todas las pestañas y decidir si merece la pena avisar.
- La deduplicación existente (`sig()` en `lib.js`, por fecha+concepto+importe contra las filas ya presentes en el board) hace que repetir la sincronización en cada apertura sea seguro sin crear duplicados.
- **Sigue sin sincronizarse**: ediciones de `importe`/`fecha` de un movimiento ya existente, y borrados — eso es la causa restante de posible divergencia entre dispositivos, documentado como fuera de alcance explícito en el spec.

**Fix: emparejar pestañas de Sheets por `gid`, no por nombre** (`switchOrCreateBoardByTab()`, antes `switchOrCreateBoardByName()`): tras activar la auto-sincronización, un dispositivo nuevo (el móvil) podía acabar con una pestaña duplicada que no existía en el ordenador. Causa: `driveDiscoverTabs()` extrae el título de cada pestaña haciendo scraping de un patrón dentro del HTML interno de Google (técnica no oficial, ya documentada como frágil más arriba) — si esa extracción devuelve el título con una variación mínima (espacio, mayúscula, algún carácter distinto) entre dos sincronizaciones o entre dos dispositivos, emparejar por nombre exacto fallaba y creaba una pestaña nueva en vez de reutilizar la existente. Ahora se empareja primero por `gid` (recorriendo todos los boards en busca de una fila con `row.src.gid` igual al de la pestaña que se está sincronizando — el `gid` es un ID numérico estable de Google, no depende del scraping), y solo cae a emparejar por nombre la primera vez que se sincroniza esa pestaña (cuando ningún board tiene aún ninguna fila con ese `gid`). Si el nombre de la pestaña cambió en Sheets, el board existente se renombra para reflejarlo en vez de crear uno nuevo. Validado con el servidor mock: sincronizar dos veces el mismo `gid` con títulos distintos reutiliza el mismo board y solo actualiza su nombre.

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
