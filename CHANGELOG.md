# Changelog

Historial de cambios del proyecto, generado a partir de los mensajes de commit. Fechas en formato AAAA-MM-DD.

## 2026-08-30

- Fix: sustituir los dos `prompt()` encadenados de "Escritura en Sheets" por un modal propio en la app — los navegadores pueden bloquear en silencio los popups nativos repetidos, haciendo que el del código secreto pareciera "desaparecer". El modal nuevo tampoco depende de eso, y añade botón de copiar.
- Fix: avisar con un mensaje claro cuando se intenta importar desde Google Sheets abriendo `index.html` directamente (`file://`) — Google bloquea esas peticiones por CORS y antes fallaba con el mensaje genérico de "no se pudo leer la hoja", sin explicar por qué. Documentado cómo probar esta función en local (servidor estático, no doble clic).
- Añadir skill de Claude Code `aidev-best-practices` (prompts efectivos, señales de alerta con el agente, checklist de sesión) y cambiar la convención de specs de un único `plan.md` a archivos numerados `docs/sdd/spec-N-nombre.md` que no se sobrescriben entre sí.
- Documentación: crear `docs/TECHNICAL.md` con la arquitectura y decisiones técnicas (movido fuera del README, que se queda centrado en qué hace la app y cómo usarla); guardar los planes SDD aprobados en `docs/sdd/` para que sean visibles en el repo, no solo locales a quien planificó.
- Añadir skill de Claude Code (`.claude/skills/sdd/`) con la metodología de trabajo Spec-Driven Development del equipo.
- UX: agrupar las acciones de la cabecera en menús desplegables ("Importar", "⚙") con accesibilidad ARIA y cierre por teclado/clic fuera.
- Eliminar `index (1).html` e `index_actualizado.html`, duplicados subidos por error.
- Añadir lógica de licencia Pro (Gumroad) en `lib.js` — verificación de clave, aún sin cablear a la interfaz.
- Auditoría UX/UI: corrige bug de botones visibles antes de tiempo, overflow en móvil, contraste de color insuficiente (WCAG AA) y hueco visual en el panel Fijo/Variable; añade 14 tests automáticos de contraste. Detalle completo en [UX_AUDIT.md](UX_AUDIT.md).
- Quitar el panel "Mes a mes" (y el día de corte); añadir panel "Fijo vs Variable" con totales del periodo.
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
