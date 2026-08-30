# Gestor Financiero

Aplicación web de finanzas personales: importa extractos bancarios y hojas de Google Sheets, categoriza los movimientos, y muestra paneles con el gasto por mes y por categoría.

**App en vivo:** https://andrearombo.github.io/gestor-financiero/

**Diseño y accesibilidad:** ver [UX_AUDIT.md](UX_AUDIT.md) — auditoría UX/UI con hallazgos medidos (no solo a ojo), qué se corrigió y qué queda pendiente de decidir.

**Documentación técnica (arquitectura, decisiones, cómo está montado por dentro):** ver [docs/TECHNICAL.md](docs/TECHNICAL.md).

## Qué hace

- **Importa extractos** en Excel (`.xlsx`, `.xlsm`, `.xls` — incluidos los `.xls` que en realidad son una tabla HTML, muy típico de la banca online) y CSV.
- **Importa directamente desde Google Sheets** (ver más abajo), leyendo todas las pestañas de la hoja de una vez.
- **Categoriza automáticamente** los movimientos por palabras clave (Mercadona → Supermercado, Netflix → Suscripciones, etc.), y permite crear categorías propias marcadas como **Gasto fijo** o **Gasto variable**.
- **Pestañas independientes** (como las hojas de un Excel): cada pestaña de la app es un tracker completo con sus propios movimientos, categorías, meses y gráficas. Sirve para separar, por ejemplo, "Movimientos" del banco de "Reformas" o "Gastos anuales".
- **Panel Fijo vs Variable**: totales y % del gasto del periodo agrupados por el `tipo` de cada categoría (Fijo/Variable), más un bloque "Sin clasificar" si hay categorías sin ese dato.
- **Edición directa**: el concepto de cada movimiento se edita haciendo clic encima; la categoría se cambia con un desplegable.
- **Selección múltiple**: marca varios movimientos y cámbiales la categoría o muévelos a otra pestaña de golpe.
- **Modo claro/oscuro.**
- Todo con deshacer, duplicados detectados al reimportar, y guardado automático.

## Cómo funciona por dentro (importante)

No hay servidor propio, ni base de datos, ni backend de ningún tipo. Los datos (movimientos, categorías, pestañas) se guardan en el **`localStorage` del navegador**. Esto tiene dos consecuencias importantes:

- **Los datos no se sincronizan entre personas ni entre dispositivos.** Cada persona que abre la app en su propio navegador tiene su propia copia, vacía al principio. Si tu marido abre la misma URL en su móvil, no verá tus movimientos — tendría que importar sus propios datos ahí.
- **Nadie más puede ver esos datos**: no salen del navegador salvo cuando tú decides leer una hoja de Google Sheets que hayas compartido por enlace. No hay copia de seguridad automática — si borras el historial del navegador o cambias de ordenador, pierdes lo guardado (puedes volver a importar el extracto o la hoja cuando quieras).

Cómo está construido por dentro (arquitectura, estructura de datos, parseo de archivos, seguridad): ver [docs/TECHNICAL.md](docs/TECHNICAL.md).

## Importar desde Google Sheets

Botón "Desde Google Sheets" (en la pantalla inicial; en la cabecera está dentro del desplegable **Importar ▾**):

1. Pide el enlace para compartir de la hoja — debe estar compartida como **"Cualquiera con el enlace puede ver"** (Google Sheets → Compartir → Acceso general). No hace falta iniciar sesión en Google ni crear nada en Google Cloud Console.
2. Intenta descubrir automáticamente **todas las pestañas** de la hoja (leyendo la página de edición pública) y crea una pestaña de la app por cada una. Si esa detección falla (algunos navegadores pueden bloquearla por CORS), cae de forma segura a importar solo la pestaña del enlace pegado, sin romperse.
3. Por cada pestaña, detecta las columnas de fecha, concepto e importe por el texto de la cabecera (Fecha/Fecha Operación, Concepto/Descripción, Importe, y también Categoria/Tag y Fijo Variable si existen) — no depende de que estén en un orden fijo.
4. Si la hoja no trae signo en el importe (algunas plantillas de presupuesto guardan todo en positivo), la app asume que es un gasto salvo que el concepto o la categoría suene claramente a ingreso (nómina, transferencia recibida, etc.).
5. Si una fecha viene sin año (p. ej. "07/01"), lo infiere del nombre de la pestaña (busca un año de 4 dígitos o el nombre del mes; si no encuentra nada, asume 2025 para pestañas de sep-dic y 2026 para ene-ago — ajusta esto en el código si tu ciclo cambia).

## Escribir cambios de vuelta en Google Sheets

Cuando cambias la categoría o editas el concepto de un movimiento que vino de Google Sheets, la app puede guardar ese cambio también en la celda original de tu hoja — así la corrección persiste para la próxima importación, y la ve cualquiera que use la misma hoja compartida.

Esto usa un **Google Apps Script** propio, no OAuth: lo autorizas tú una sola vez desde tu cuenta (sin pantallas de "app no verificada"), y la app le manda peticiones sin que nadie tenga que iniciar sesión con Google desde el navegador.

**Importante sobre seguridad:** un Apps Script Web App con acceso "Cualquier usuario" es una URL pública — cualquiera que la consiguiera podría, en principio, mandarle peticiones. Por eso el script de abajo exige un **código secreto** que solo tú conoces (la app te lo genera y te lo enseña una vez) y limita qué filas/columnas se pueden tocar, para que ni con la URL filtrada se pueda escribir nada fuera de una selección de movimientos.

**Cómo activarlo:**

Hay dos caminos para crear el script — usa el que te funcione:

- **Camino normal**: abre tu Google Sheet → menú **Extensiones → Apps Script**.
- **Si no ves "Extensiones"** en la barra de menús (pasa a veces, sin razón clara): ve directamente a **[script.new](https://script.new)** (o [script.google.com/create](https://script.google.com/create)) en una pestaña nueva, con la misma cuenta de Google. Esto crea un proyecto de Apps Script "suelto" (no hace falta pasarlo por el menú de la hoja) — usa el código de abajo, que ya abre la hoja por su ID en vez de depender de "la hoja donde vive el script".

1. Borra el contenido de `Código.gs` y pega esto (cambia `TU_ID_DE_HOJA` por el ID de tu hoja — es la parte de la URL entre `/d/` y `/edit`, algo como `1xcZCC_fu2-jvvcVoFaqmdzC7ZiJhgzx8`):

   ```javascript
   var SECRET = "PEGA_AQUI_TU_CODIGO_SECRETO"; // te lo da la app al activar la escritura
   var SHEET_ID = "TU_ID_DE_HOJA"; // el ID de tu Google Sheet (de la URL, entre /d/ y /edit)

   function doPost(e) {
     var body = JSON.parse(e.postData.contents);
     if (body.secret !== SECRET) {
       return ContentService.createTextOutput(JSON.stringify({error: "unauthorized"}))
         .setMimeType(ContentService.MimeType.JSON);
     }
     var row = Number(body.row), col = Number(body.col);
     if (!(row >= 2 && row <= 5000 && col >= 1 && col <= 40)) {
       return ContentService.createTextOutput(JSON.stringify({error: "out of range"}))
         .setMimeType(ContentService.MimeType.JSON);
     }
     var ss = SpreadsheetApp.openById(SHEET_ID);
     var sheet = null;
     var sheets = ss.getSheets();
     for (var i = 0; i < sheets.length; i++) {
       if (String(sheets[i].getSheetId()) === String(body.gid)) { sheet = sheets[i]; break; }
     }
     if (!sheet) {
       return ContentService.createTextOutput(JSON.stringify({error: "sheet not found"}))
         .setMimeType(ContentService.MimeType.JSON);
     }
     sheet.getRange(row, col).setValue(String(body.value).slice(0, 500));
     return ContentService.createTextOutput(JSON.stringify({ok: true}))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

   (Si usaste el camino normal desde **Extensiones → Apps Script**, también puedes dejar `SpreadsheetApp.getActiveSpreadsheet()` en vez de `openById` — ambas funcionan igual estando dentro de la hoja, pero `openById` funciona siempre, vengas por donde vengas.)

3. Guarda el proyecto (ponle un nombre, p. ej. "GestorFinancieroAPI").
4. **Implementar → Nueva implementación** → tipo **Aplicación web**.
   - Ejecutar como: **Yo** (tu cuenta).
   - Quién tiene acceso: **Cualquier usuario**.
5. Pulsa Implementar. Te pedirá autorizar el script para editar tus hojas — es un permiso tuyo, sobre tu propia hoja, un único clic de "Permitir".
6. Copia la URL de la aplicación web (termina en `/exec`).
7. En la app, desplegable **⚙ ▾** de la cabecera → **"🔗 Escritura en Sheets"** → se abre un cuadro donde pegas esa URL y pulsas **Guardar**. Justo después el mismo cuadro cambia y te enseña el código secreto con un botón **Copiar** — pégalo en `PEGA_AQUI_TU_CODIGO_SECRETO` del script (paso 2), guarda, y vuelve a **Implementar → Gestionar implementaciones → editar (lápiz) → Nueva versión → Implementar** para que el cambio surta efecto. (Puedes volver a abrir este mismo cuadro cuando quieras para ver el secreto de nuevo o desactivar la escritura dejando la URL vacía y guardando.)

A partir de ahí, cambiar una categoría en la app también la cambia en la hoja (columna Categoría/Tag y, si existe, Fijo/Variable). Editar un concepto actualiza la columna Concepto/Descripción. Los movimientos añadidos a mano en la app, o los importados desde un Excel local (no Sheets), no se escriben de vuelta a ningún sitio — solo aplica a filas que vinieron de una hoja de Sheets importada.

Si prefieres no activarlo, deja el campo vacío al pedírtelo — la app sigue funcionando igual, solo que los cambios se quedan solo en tu navegador.

**Si cambias una categoría y no ves confirmación, o ves un aviso rojo de error**: la app ahora te dice explícitamente si la escritura en Sheets falló y por qué (antes fallaba en silencio). La causa más habitual es haber editado el secreto en el script (paso 7) sin volver a **Implementar → Gestionar implementaciones → editar → Nueva versión → Implementar** — hasta que no repites ese último paso, la versión publicada del script sigue teniendo el secreto antiguo y rechaza todo con "unauthorized".

## Desarrollo / cómo contribuir

- **`index.html`**: interfaz, estilos y la lógica que depende de la app (pestañas, render, Google Sheets, escritura). No tiene build ni dependencias que instalar.
- **`lib.js`**: toda la lógica pura sin DOM — parseo de fechas/importes, categorización, CSV, extracción de enlaces de Sheets. Se carga antes que el script principal (`<script src="lib.js">`) y es lo que testea `tests.html`. Si tocas fechas, importes, CSV o categorización, casi seguro que el cambio va aquí, no en `index.html`.
- **`tests.html`**: batería de tests de `lib.js`. Ábrelo en el navegador — pinta cada test en verde/rojo y un resumen arriba. No necesita servidor ni build: doble clic y listo.
- Para probar cambios en local, basta con abrir `index.html` (o `tests.html`) con doble clic — deben estar en la misma carpeta que `lib.js` para que la ruta relativa `src="lib.js"` funcione. **Excepción: "Desde Google Sheets" no funciona así.** Abrir el archivo directamente usa el protocolo `file://`, y Google bloquea por CORS las peticiones hechas desde ese origen (la app ya te avisa de esto si lo intentas). Para probar la importación desde Sheets en local, sirve la carpeta con un servidor estático real — por ejemplo la extensión **Live Server** de VS Code, o `npx serve` — y ábrela por `http://localhost:...` en vez de `file://`. En la web publicada (GitHub Pages) esto no aplica, funciona con normalidad.
- Para publicar: rama nueva por cambio + `git push` + Pull Request en GitHub (revisar el diff y **Merge pull request**). GitHub Pages despliega automáticamente en `https://andrearombo.github.io/gestor-financiero/` en cuanto se fusiona a `main` (tarda 1-2 minutos; si no ves el cambio, prueba un refresco forzado — Ctrl+Shift+R — porque el navegador puede cachear la versión anterior).
- **Añadir un colaborador**: en GitHub, Settings del repo → Collaborators → Add people (con su usuario o email de GitHub). Un colaborador con acceso puede editar el código y abrir PRs, pero **no comparte automáticamente los datos financieros** — esos son locales de cada navegador (ver más arriba).
- **Antes de publicar un cambio en `lib.js`**, abre `tests.html` y comprueba que sigue en verde. Si añades un formato de fecha/importe nuevo o una fuente de datos nueva, añade también su test — así queda protegido para siempre, no solo probado una vez a mano.
- **Skills de Claude Code** (`.claude/skills/`, se cargan solas al usar Claude Code en este repo): `sdd/SKILL.md` documenta la metodología Spec-Driven Development (cuándo definir spec antes de programar, dimensionamiento, reglas de oro); `aidev-best-practices/SKILL.md` complementa con prompts efectivos, señales de alerta con el agente, y checklist de sesión.
- **`CLAUDE.md`** (en la raíz): instrucciones que Claude Code lee en cada sesión de este repo — checklist de cierre, reglas críticas (no tocar claves de `localStorage`, siempre rama+PR, etc.) y convenciones de código reales del proyecto.

## Seguridad

Nunca se envían credenciales de Google a ningún sitio, todo el texto que viene de fuera se escapa antes de insertarse en la página (evita XSS), y la escritura a Sheets está protegida por un código secreto propio. Detalle completo en [docs/TECHNICAL.md](docs/TECHNICAL.md#seguridad).

## Historial de cambios

Ver [CHANGELOG.md](CHANGELOG.md).

## Limitaciones conocidas

- **"Desde Google Sheets" solo funciona con Hojas de Cálculo de Google nativas** (URL con `/spreadsheets/d/...`). Un archivo Excel subido a Google Drive sin convertir a Sheets (URL de Drive con `/file/d/...`) no se reconoce — hay que abrirlo en Drive y "Guardar como Hojas de cálculo de Google" primero, o descargarlo e importarlo como archivo local (Excel/CSV).
- La detección automática de todas las pestañas de Google Sheets depende de leer la página de edición pública y buscar un patrón dentro de su HTML interno; es una técnica no oficial que Google podría cambiar en el futuro. Si deja de funcionar, seguirá funcionando la importación de una sola pestaña (la del enlace pegado).
- Sin backend, no hay multiusuario real ni sincronización entre dispositivos.
- Los años inferidos para fechas sin año en pestañas sin nombre de mes (p. ej. "Reforma cuarto") son una suposición razonable, no una certeza — conviene revisarlos tras importar.
