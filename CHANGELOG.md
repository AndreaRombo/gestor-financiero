# Changelog

Historial de cambios del proyecto, generado a partir de los mensajes de commit. Fechas en formato AAAA-MM-DD.

## 2026-08-30

- Añadir `.gitignore` para excluir configuración local de Claude Code.
- README: alternativa `script.new` cuando no aparece el menú "Extensiones" en Sheets.
- Seguridad: escapar labels de categoría (XSS), asegurar escritura a Sheets con secreto; extraer lógica pura a `lib.js` con 62 tests.
- Escribir cambios de categoría y concepto de vuelta en Google Sheets vía Apps Script.
- Añadir README con documentación del proyecto para colaboradores.
- Reconocer columna "Tag" como categoría en pestañas importadas desde extracto bancario.
- Importar todas las pestañas de Google Sheets como tableros separados, con categoría y Fijo/Variable del propio archivo.
- Leer Google Sheets por enlace compartido en lugar de OAuth/Picker.
- Importar extractos directamente desde Google Drive (Picker, scope `drive.file`).

## 2026-08-28

- Concepto editable y sin truncar en tabla y tarjetas.
- Añadir soporte `.xls`, categorías personalizadas, pestañas múltiples, selección en bloque y modo claro/oscuro.

## 2026-08-27

- Primera subida del proyecto (`index.html`).
