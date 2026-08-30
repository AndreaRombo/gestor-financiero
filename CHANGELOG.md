# Changelog

Historial de cambios del proyecto, generado a partir de los mensajes de commit. Fechas en formato AAAA-MM-DD.

## 2026-08-30

- Fix: en el móvil, al configurarse por el enlace para compartir, solo aparecía una pestaña genérica "Google Sheets" con datos incompletos en vez de las pestañas reales de la hoja (mientras que en el ordenador sí se veían bien). Causa: el descubrimiento automático de pestañas (scraping no oficial del HTML de Google) fallaba en el móvil. Ahora cada sincronización con éxito guarda la lista real de pestañas (`fin:sheettabs`), esa lista viaja también dentro del enlace de configuración, y si el descubrimiento falla en algún dispositivo, se usa esa lista guardada en vez de crear una pestaña genérica. Quien ya generó un enlace para compartir antes de este cambio debe generarlo de nuevo (⚙ → Escritura en Sheets → Guardar) para que incluya la lista de pestañas.
- Fix: al sincronizar desde un dispositivo nuevo (p. ej. el móvil, tras abrir el enlace de configuración) podía aparecer una pestaña duplicada que no existía en el ordenador. Causa: las pestañas de Sheets se emparejaban por el nombre extraído por scraping del HTML de Google, que puede variar ligeramente entre sincronizaciones; ahora se emparejan por el `gid` (ID estable de Google), no por nombre.
- Docs: afinar en la skill `sdd` el criterio de cuándo hace falta un spec-N — no "si parece pequeño", sino si el cambio introduce UI/flujo nuevo o hubo que elegir entre varios enfoques.
- Feature: configuración de Google Sheets portátil entre dispositivos y auto-sincronización al abrir la app. Un enlace para compartir (con la hoja + escritura ya configuradas dentro) permite conectar un móvil u otro navegador de un solo golpe, sin pegar nada a mano; y una vez conectada la hoja, la app trae los movimientos nuevos sola cada vez que se abre (sin pulsar "Importar"), avisando solo si hay algo nuevo. Pensado para que dos personas (p. ej. pareja) que comparten una hoja vean siempre lo mismo sin repetir la configuración en cada dispositivo. Ediciones de importe/fecha y borrados todavía no se sincronizan (ver [spec-3](docs/sdd/spec-3-config-portatil-y-auto-sync.md)).
- Feature: añadir un movimiento a mano ("Añadir movimiento") en una pestaña que vino de Google Sheets ahora también escribe una fila nueva al final de esa pestaña en la hoja real, no solo en el navegador — así lo ve cualquiera que use la misma hoja compartida. Requiere una acción nueva en el Apps Script (`action:"appendRow"`); quien ya tenga el script desplegado debe sustituir el código (ver README) y redesplegar una versión nueva. Ver [spec-2](docs/sdd/spec-2-anadir-movimiento-escribe-fila-nueva-en-sheets.md).
- Fix: la escritura en Google Sheets fallaba en silencio sin avisar si algo iba mal (secreto no coincide, fila/columna fuera de rango, hoja no encontrada). `writeBackCell()` intenta ahora una petición normal para leer la respuesta real del Apps Script y avisar con el motivo exacto; si esa petición falla por CORS, cae a una petición a ciegas como red de seguridad (avisando de que no se pudo confirmar). Validado con un servidor HTTP local que simula las cuatro respuestas del Apps Script más el caso de servidor inalcanzable.
- Seguridad: sustituir el ID real de una hoja de Google Sheets (usado por error como dato de ejemplo en `tests.html` y el README) por uno inventado. Ese ID correspondía a una hoja compartida "cualquiera con el enlace puede ver" con datos financieros reales — quedaba accesible para cualquiera que leyera el código público del repo. La hoja real debe rotarse (compartir una copia nueva) porque el ID viejo sigue en el historial de git.
- Fix: el modal de "Escritura en Sheets" ya no se cierra al hacer clic fuera de él — este flujo obliga a cambiar de pestaña (para copiar la URL, luego el secreto en Apps Script) y era fácil que un clic accidental al volver lo cerrara sin avisar.
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
