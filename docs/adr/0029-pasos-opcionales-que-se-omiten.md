# 0029. Pasos opcionales que el asesor omite

- Estado: Aceptada (el asesor pidió el 09/10/2026 que cada módulo terminado quede como hecho y que lo que no es obligatorio se pueda saltar). Actualiza el ADR 0025 en los pasos de cada etapa.
- Fecha: 2026-10-09

## Contexto

Los pasos de cada etapa se marcan solos con los datos del caso (ADR 0025): "Registrar las deudas" se marca con una deuda, "Revisar los seguros" con un seguro. Un cliente sin deudas, sin seguros o sin metas deja ese paso pendiente para siempre. Con él quedan pendientes el control de calidad, que espera los datos de la etapa, y la etapa entera, aunque el asesor ya la haya trabajado.

## Decisión

- **El asesor omite los pasos opcionales** de cada cliente con un botón "Omitir" al lado del paso. Un paso omitido cuenta como hecho: dice "Omitido", el siguiente paso pasa al que sigue y el control de calidad deja de esperarlo. "Deshacer" lo vuelve a dejar pendiente.
- **Opcionales:** lo que un cliente puede no tener (cuentas y saldos, bolsillos, deudas, patrimonio, seguros y metas) y lo que el control de calidad solo avisa (prueba de realidad y perfil de riesgo). **No se omiten** el núcleo (perfil e ingresos), los gastos, la tasa y la cuota de cada deuda registrada, el control de calidad y la entrega del reporte: sin ellos la etapa no tiene reporte.
- **Los datos mandan:** si un paso omitido recibe datos, cuenta como hecho sin más. Al omitir las deudas sin tener ninguna, "Completar la tasa y la cuota" también queda omitido; con deudas registradas, sigue pendiente hasta completarlas.
- **La etapa queda terminada** cuando todos sus pasos están hechos u omitidos; como la entrega no se omite, una etapa terminada tiene su reporte. La ficha lo dice en lugar del conteo de pasos.
- Se guarda en `case_settings.skipped_steps` (identificadores de paso de la app), que escribe solo el asesor, como las etapas activas. El motor no lo lee.

## Consecuencias

- Migración `skipped_steps` con pgTAP; sin tablas nuevas. Hay que subirla al remoto antes de publicar el código: la ficha la lee.
- `ENGINE_VERSION` y las pruebas de oro no cambian.
- Omitir no cambia lo que bloquea la entrega: si hay gastos tipo bolsillo sin bolsillo, `items_have_pocket` sigue bloqueando aunque el paso de bolsillos esté omitido.

## Alternativas consideradas

- **Marcar a mano cualquier paso como hecho:** deja terminar una etapa sin gastos o sin entrega, y el reporte saldría vacío.
- **Dar por hechos los pasos sin datos:** un paso olvidado se vería igual que uno que no aplica.
- **Una casilla "No tiene" en cada pantalla (deudas, seguros, metas):** el dato quedaría repartido en seis pantallas para una sola decisión de la ficha.
