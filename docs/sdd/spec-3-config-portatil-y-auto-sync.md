# Spec 3: configuración portátil entre dispositivos + auto-sincronización al abrir

## Contexto

Andrea y su marido usan la misma app en varios dispositivos (ordenador, móvil), y la app debe basarse en un único Google Sheet compartido para que los dos vean lo mismo. Hoy eso no funciona bien:

- La conexión a Google Sheets (enlace de la hoja) y la configuración de escritura (URL + secreto del Apps Script) viven solo en el `localStorage` del navegador donde se configuraron. Al abrir la app en otro dispositivo no hay nada guardado — hay que pegar el enlace y volver a montar la escritura desde cero.
- Importar desde Sheets es una acción manual (botón "Desde Google Sheets"). Si una persona añade movimientos y la otra no pulsa ese botón, ve datos desactualizados — de ahí la sensación de "vemos cosas distintas".

Confirmado con la usuaria (Interview, dos preguntas):
1. La forma de portar la configuración entre dispositivos es un **enlace para compartir** que lleva dentro el enlace de la hoja + la URL y el secreto de escritura del Apps Script; se abre una vez en cada dispositivo y queda configurado solo. Aceptado explícitamente que el secreto viaja dentro del enlace y que hay que compartirlo con cuidado (no por un canal público).
2. La app debe **auto-sincronizar con la hoja cada vez que se abre** (en segundo plano, sin que haga falta pulsar nada), no solo cuando se pulsa el botón de importar a mano.

**Fuera de alcance, decisión explícita para mantener el spec pequeño:**
- No se sincronizan ediciones de `importe`/`fecha` de un movimiento ya existente, ni borrados — eso ya estaba fuera de alcance en el spec anterior (escritura de fila nueva) y sigue estándolo aquí. Es la causa restante de posible divergencia entre dispositivos; se deja para un spec futuro si hace falta.
- No hay sincronización en tiempo real (websockets, polling continuo) — el refresco ocurre solo al abrir/recargar la app, no mientras está abierta.
- No se cifra el secreto dentro del enlace ni se ofrece una alternativa sin secreto en la URL (opción A elegida explícitamente en la Interview).

---

## Criterios de aceptación

```gherkin
Escenario: Generar un enlace para compartir la configuración
  Given ya tengo conectada una hoja de Google Sheets y la escritura configurada (URL + secreto)
  When abro "⚙ → Escritura en Sheets" y guardo (o repaso la pantalla del secreto)
  Then veo un campo con un enlace único que incluye el enlace de mi hoja, la URL del Apps Script y el secreto
  And puedo copiarlo con un botón
  And veo un aviso claro de que ese enlace lleva el secreto dentro y debe compartirse solo por un canal privado

Escenario: Abrir el enlace de configuración en un dispositivo nuevo
  Given recibo el enlace para compartir y lo abro en el navegador de mi móvil (donde la app nunca se configuró)
  When la página carga
  Then queda guardada automáticamente la conexión a la hoja y la configuración de escritura, sin tener que pegar nada a mano
  And la URL visible en el navegador ya no contiene el secreto (se limpia tras aplicarlo)
  And veo un aviso confirmando que la configuración se guardó en este dispositivo
  And la app sincroniza automáticamente con la hoja a continuación (ver escenario siguiente)

Escenario: Auto-sincronizar al abrir la app con una hoja ya conectada
  Given este dispositivo ya tiene una hoja de Google Sheets conectada (fin:sheetlink guardado)
  When abro la app (o recargo la página)
  Then la app trae en segundo plano los movimientos nuevos de la hoja, sin que tenga que pulsar "Importar"
  And si hay movimientos nuevos, veo un aviso breve indicando cuántos se han añadido
  And si no hay ninguno nuevo, no veo ningún aviso (no quiero ruido cada vez que abro la app)
  And sigo viendo la pestaña en la que estaba, no me cambia de pantalla sin avisar

Escenario: Auto-sincronización falla (sin conexión, hoja no accesible)
  Given este dispositivo tiene una hoja conectada pero no hay conexión a internet (o la hoja dejó de ser accesible)
  When abro la app
  Then la app seguía funcionando con los datos que ya tenía guardados localmente
  And no me interrumpe con un aviso de error llamativo solo por abrir la app (sería ruido cada vez que esté sin cobertura)

Escenario: Abrir la app sin conexión a Sheets configurada
  Given nunca he conectado esta pestaña/dispositivo a una hoja de Google Sheets
  When abro la app
  Then no se intenta ninguna sincronización automática ni petición de red por Sheets
  And la app funciona igual que hoy
```

---

## Notas para el TechPlan

- **Enlace de configuración**: codificar `{s: fin:sheetlink, w: fin:writeurl, k: fin:writesecret}` en base64 dentro de `location.hash` (`#cfg=...`), no en query string — así no queda en peticiones de servidor y se puede limpiar de la barra de direcciones con `history.replaceState()` justo después de aplicarlo (reduce que quede en el historial del navegador, aunque no lo elimina si alguien lo comparte por un canal que guarda capturas/mensajes — eso es responsabilidad de cómo se comparta, ya avisado en el propio texto del botón).
- **Aplicar el enlace**: debe ejecutarse muy pronto en el arranque, antes de `load()`, para que el resto del arranque (incluida la auto-sincronización) ya vea `fin:sheetlink`/`fin:writeurl`/`fin:writesecret` guardados.
- **Auto-sync**: reutilizar la lógica de `importFromDrive()` (descubrir pestañas, descargar CSV, `ingestMatrix`) extrayéndola a una función compartida que acepte un modo "silencioso" — sin `confirm()`/`prompt()`, sin el aviso "X movimientos añadidos · Y duplicados" por cada pestaña (eso sería ruido si se repite en cada apertura), sin bloquear con `busy()`. Solo mostrar un aviso agregado si el total de movimientos nuevos añadidos es mayor que 0; los fallos de red se tragan en silencio (no interrumpir por algo que puede pasar simplemente por estar sin cobertura en el móvil).
- El auto-sync no debe cambiar la pestaña activa que ve la usuaria: debe volver a la pestaña en la que estaba antes de sincronizar, aunque internamente tenga que cambiar de pestaña para poder actualizar cada una (reutiliza `switchOrCreateBoardByName`).
- La deduplicación ya existente en `ingestMatrix` (`sig()` por fecha+concepto+importe, comparado contra las filas ya presentes en el board) hace que repetir la sincronización sea seguro sin crear duplicados — no hace falta lógica nueva de dedupe para esto.
- El botón "Generar enlace para compartir" vive en el modal de escritura (`#writeOverlay`, paso 2 — donde ya se muestra el secreto), reutilizando los valores que ya están en `localStorage` en ese momento.
