# Gestor Financiero

Aplicación web de finanzas personales: importa extractos bancarios y hojas de Google Sheets, categoriza los movimientos, y muestra paneles con el gasto por mes y por categoría.

**App en vivo:** https://andrearombo.github.io/gestor-financiero/

## Qué hace

- **Importa extractos** en Excel (`.xlsx`, `.xlsm`, `.xls` — incluidos los `.xls` que en realidad son una tabla HTML, muy típico de la banca online) y CSV.
- **Importa directamente desde Google Sheets** (ver más abajo), leyendo todas las pestañas de la hoja de una vez.
- **Categoriza automáticamente** los movimientos por palabras clave (Mercadona → Supermercado, Netflix → Suscripciones, etc.), y permite crear categorías propias marcadas como **Gasto fijo** o **Gasto variable**.
- **Pestañas independientes** (como las hojas de un Excel): cada pestaña de la app es un tracker completo con sus propios movimientos, categorías, meses y gráficas. Sirve para separar, por ejemplo, "Movimientos" del banco de "Reformas" o "Gastos anuales".
- **Corte de mes personalizable**: si cobras un día distinto al 1 (por ejemplo el 28), cada pestaña puede agrupar los meses según ese ciclo en vez del mes natural.
- **Edición directa**: el concepto de cada movimiento se edita haciendo clic encima; la categoría se cambia con un desplegable.
- **Selección múltiple**: marca varios movimientos y cámbiales la categoría o muévelos a otra pestaña de golpe.
- **Modo claro/oscuro.**
- Todo con deshacer, duplicados detectados al reimportar, y guardado automático.

## Cómo funciona por dentro (importante)

Todo el código —HTML, CSS y JavaScript— vive en un único archivo: **`index.html`**. No hay servidor propio, ni base de datos, ni backend de ningún tipo.

Los datos (movimientos, categorías, pestañas) se guardan en el **`localStorage` del navegador**, bajo la clave `fin:v2`. Esto tiene dos consecuencias importantes:

- **Los datos no se sincronizan entre personas ni entre dispositivos.** Cada persona que abre la app en su propio navegador tiene su propia copia, vacía al principio. Si tu marido abre la misma URL en su móvil, no verá tus movimientos — tendría que importar sus propios datos ahí.
- **Nadie más puede ver esos datos**: no salen del navegador salvo cuando tú decides leer una hoja de Google Sheets que hayas compartido por enlace. No hay copia de seguridad automática — si borras el historial del navegador o cambias de ordenador, pierdes lo guardado (puedes volver a importar el extracto o la hoja cuando quieras).

## Importar desde Google Sheets

Botón "Desde Google Sheets" (en la pantalla inicial y en la cabecera):

1. Pide el enlace para compartir de la hoja — debe estar compartida como **"Cualquiera con el enlace puede ver"** (Google Sheets → Compartir → Acceso general). No hace falta iniciar sesión en Google ni crear nada en Google Cloud Console.
2. Intenta descubrir automáticamente **todas las pestañas** de la hoja (leyendo la página de edición pública) y crea una pestaña de la app por cada una. Si esa detección falla (algunos navegadores pueden bloquearla por CORS), cae de forma segura a importar solo la pestaña del enlace pegado, sin romperse.
3. Por cada pestaña, detecta las columnas de fecha, concepto e importe por el texto de la cabecera (Fecha/Fecha Operación, Concepto/Descripción, Importe, y también Categoria/Tag y Fijo Variable si existen) — no depende de que estén en un orden fijo.
4. Si la hoja no trae signo en el importe (algunas plantillas de presupuesto guardan todo en positivo), la app asume que es un gasto salvo que el concepto o la categoría suene claramente a ingreso (nómina, transferencia recibida, etc.).
5. Si una fecha viene sin año (p. ej. "07/01"), lo infiere del nombre de la pestaña (busca un año de 4 dígitos o el nombre del mes; si no encuentra nada, asume 2025 para pestañas de sep-dic y 2026 para ene-ago — ajusta esto en el código si tu ciclo cambia).

## Estructura de datos

- **Pestaña (board)**: `{ id, name, fileName, rows, customCats, month, active, sort, cutoff }`
- **Movimiento (row)**: `{ id, fecha, concepto, importe, categoria, manual, añadido }` — `importe` negativo es gasto, positivo es ingreso.
- **Categoría**: built-in (`BASE_CATS`) + personalizadas por pestaña (`customCats`), cada una con `{ label, color, tipo }` donde `tipo` es `"fijo"` o `"variable"`.

## Desarrollo / cómo contribuir

- Es un único archivo HTML sin build ni dependencias que instalar. Para probar cambios en local, basta con abrir `index.html` con doble clic (o servirlo con cualquier servidor estático).
- Para publicar: `git commit` + `git push` a `main`. GitHub Pages despliega automáticamente en `https://andrearombo.github.io/gestor-financiero/` (tarda 1-2 minutos; si no ves el cambio, prueba un refresco forzado — Ctrl+Shift+R — porque el navegador puede cachear la versión anterior).
- **Añadir un colaborador**: en GitHub, Settings del repo → Collaborators → Add people (con su usuario o email de GitHub). Un colaborador con acceso puede editar el código y hacer push, pero **no comparte automáticamente los datos financieros** — esos son locales de cada navegador (ver más arriba).

## Librerías externas

- [SheetJS (xlsx)](https://cdnjs.cloudflare.com/ajax/libs/xlsx/) vía CDN — solo se usa para leer archivos `.xls` binarios reales (los disfrazados de HTML se leen sin ninguna librería, con `DOMParser`).
- Google Fonts (Space Grotesk, Inter, JetBrains Mono).

## Limitaciones conocidas

- La detección automática de todas las pestañas de Google Sheets depende de leer la página de edición pública y buscar un patrón dentro de su HTML interno; es una técnica no oficial que Google podría cambiar en el futuro. Si deja de funcionar, seguirá funcionando la importación de una sola pestaña (la del enlace pegado).
- Sin backend, no hay multiusuario real ni sincronización entre dispositivos.
- Los años inferidos para fechas sin año en pestañas sin nombre de mes (p. ej. "Reforma cuarto") son una suposición razonable, no una certeza — conviene revisarlos tras importar.
