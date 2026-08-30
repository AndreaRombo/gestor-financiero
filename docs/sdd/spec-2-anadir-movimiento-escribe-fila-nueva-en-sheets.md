# Spec 2: añadir un movimiento a mano escribe una fila nueva en la Google Sheet vinculada

## Contexto

Ya existe escritura de vuelta a Google Sheets, pero solo para **editar una celda de una fila que ya vino de la hoja** (cambiar categoría o concepto de un movimiento importado — `writeBackCell()`/`writeBackCategoryChange()`, ver spec anterior y PR #14). No cubre el caso que la usuaria pide ahora: **añadir un movimiento nuevo a mano** (botón "Añadir movimiento") en una pestaña que vino de Sheets no crea ninguna fila en la hoja real — el movimiento se queda solo en `localStorage`, invisible para quien más use esa hoja compartida (su marido).

Confirmado con la usuaria (Interview, una pregunta): el alcance es exactamente ese — un movimiento añadido a mano en una pestaña vinculada a Sheets debe aparecer como fila nueva en la hoja de verdad.

**Fuera de alcance, decisión explícita para mantener el spec pequeño:**
- Editar `importe`/`fecha` de un movimiento ya existente no se sincroniza (hoy tampoco se sincroniza nada salvo categoría/concepto — no se amplía en este spec).
- Borrar un movimiento (`delRow`) no borra la fila en Sheets.
- Pestañas que NO vinieron de una importación de Sheets (Excel local, "Empezar a mano" desde cero) — el movimiento se queda solo local, como hoy. No hay forma de "vincular" una pestaña a una hoja después de creada.
- Si se borran todos los movimientos importados de una pestaña vinculada a Sheets (quedando 0 filas con `.src`), un movimiento nuevo añadido después no podrá sincronizarse (no hay de dónde deducir el `gid`/columnas) — caso raro, no se resuelve aquí.

Si en el futuro se necesita sincronizar ediciones de importe/fecha o borrados, es un spec nuevo.

---

## Criterios de aceptación

```gherkin
Escenario: Añadir un movimiento a mano en una pestaña vinculada a Sheets con escritura activada
  Given estoy en una pestaña que se importó de Google Sheets
  And ya tengo la escritura a Sheets configurada (URL + secreto)
  When añado un movimiento nuevo con el botón "Añadir movimiento"
  Then el movimiento aparece en la app inmediatamente, como hoy
  And además se envía una petición para añadir una fila nueva a la pestaña de Sheets de la que vino ese board
  And si se confirma, veo un aviso de éxito
  And si falla, veo un aviso con el motivo (igual que ya pasa al cambiar una categoría)

Escenario: Añadir un movimiento en una pestaña vinculada a Sheets pero sin escritura configurada
  Given estoy en una pestaña que vino de Sheets
  And NO tengo configurada la escritura (sin URL/secreto guardados)
  When añado un movimiento nuevo
  Then el movimiento se guarda igual en la app
  And no se intenta ninguna petición a Sheets ni aparece ningún aviso de error

Escenario: Añadir un movimiento en una pestaña que no vino de Sheets
  Given estoy en una pestaña creada desde un Excel local o "Empezar a mano"
  When añado un movimiento nuevo
  Then el movimiento se guarda igual en la app
  And no se intenta ninguna petición a Sheets (no hay ninguna fila de esa pestaña con datos de origen de Sheets)

Escenario: La pestaña de Sheets no tiene columna de Categoría/Tag o de Fijo/Variable
  Given la pestaña de origen (p. ej. "Inversiones") solo tiene columnas de fecha/concepto/importe
  When añado un movimiento nuevo
  Then la fila nueva en Sheets rellena las columnas que sí existen (fecha, concepto, importe)
  And no falla ni dejar columnas basura por las que no existen
```

---

## Notas para el TechPlan

- Reutilizar la info de `row.src` (`gid`, `catCol`, `fjCol`, `cCol`) que ya guarda cada fila importada de Sheets — no hace falta persistir nada nuevo por pestaña. Para saber si el board actual está "vinculado", basta con que **alguna** fila de `rows` tenga `.src`.
- Falta guardar también la columna de **fecha** y de **importe** por fila (`row.src` hoy no las tiene, solo se usaron dentro de `ingestMatrix` de forma transitoria) — necesarias para poder rellenar una fila nueva completa. Añadirlas a `row.src` al importar.
- El número de fila donde insertar lo decide el propio Apps Script (`Sheet.appendRow()`), no el cliente — evita colisiones si la hoja cambió desde la última importación.
- Requiere una acción nueva en el Apps Script (`action:"appendRow"`) — **el script que la usuaria ya tiene desplegado no la tiene**; hay que actualizar el código del README y ella debe volver a implementar una nueva versión. Documentarlo bien visible, es el mismo tipo de error ("me falla y no sé por qué") que ya se corrigió en el spec/PR anterior.
