# 0028. Reportes que el cliente usa y etapas coherentes

- Estado: Aceptada (el asesor pidió arreglar lo encontrado en la revisión del 09/10/2026 y mejorar lo que recibe el cliente). Actualiza el ADR 0025 en los puntos marcados.
- Fecha: 2026-10-09

## Contexto

La revisión de extremo a extremo (`12-plan-de-mejoras-del-asesor.md`) encontró que lo que llega al cliente no está a la altura del cálculo y que las etapas dejan pasar cosas:

- El saldo de hoy que reparte la etapa 1 se registra en Patrimonio, que es de la etapa 3 (R4).
- El reporte de deudas sale con "Todo en orden" aunque el año cierre en déficit (R2), y una meta sin bolsillo no bloquea el reporte de patrimonio (R8).
- Si el sobrante no completa el fondo, el reporte vuelve al aporte de 12 meses de la plantilla, que el cliente no puede pagar (R3).
- Mi plan es el panel del asesor: la carta plegada, 15 cifras sin referencia y supuestos técnicos; el PDF no trae la tabla de bolsillos ni el plan de deudas con sus cuotas (R5).
- La carta llega en blanco en cada etapa (R11), y hay detalles de pantalla que se notan (R12).

## Decisión

**Etapas (actualiza el ADR 0025).**

- La etapa 1 pide "Registrar cuentas y saldos" y muestra la tarjeta "Cuentas y saldos", que lleva a Patrimonio. La prueba de realidad ofrece lo registrado en cuentas e inversiones como ahorro de hoy.
- El déficit del año (`no_income_covered`) es un control común: pide nota en cualquier entrega. Deudas suma `debt_payment_covers_interest` y `debt_in_arrears`; patrimonio suma `pocket_contributions_match` e `items_have_pocket`, porque el aporte a una meta es un gasto tipo bolsillo. Presupuesto suma `reality_check_not_overstated` (ADR 0027).

**Lo que recibe el cliente.**

- El plan entregado (Mi plan, la vista del asesor y el PDF) va en este orden: el resumen de la carta, abierto; las próximas tareas (solo en Mi plan, son datos vivos); "Cómo va el plan" con cuatro indicadores, su semáforo con icono y texto, una frase sin jerga y la referencia orientativa del protocolo (sección 7); los bolsillos como tabla de lo que se pasa cada mes, con el total; el plan de deudas; patrimonio, metas e inversión; el resto de la carta y las notas; la comparación con hoy; y, plegado, "Todas las cifras y supuestos".
- Con el plan secuencial, el fondo nunca muestra el aporte de 12 meses: dice cuándo se completa, que ya está completo o que el sobrante de hoy no lo completa, y no suma al total de aportes.
- El inicio del cliente muestra los indicadores de su último reporte.
- El PDF lleva el nombre del asesor que entregó el plan, el resumen arriba y las tablas de cómo va, bolsillos, deudas y metas antes del resto de la carta. Sigue armándose solo con lo que guardó la entrega (ADR 0020).

**Para el asesor.**

- La carta ofrece "Proponer un borrador": llena solo las secciones vacías con un texto inicial de las etapas activas, con marcadores de cifras y en el trato del cliente. Fortalezas y puntos de atención quedan a su criterio.
- Una meta nueva crea su bolsillo con su nombre si no se elige uno.
- Las deudas muestran la tasa de usura de referencia con su mes y fuente, y marcan cuotas atrasadas, cuota que no cubre intereses y tasas cerca o por encima de la usura vigente.
- Los topes para declarar renta de Colombia se marcan en el perfil y Costo de vida muestra solo la comparación que corresponde a cada uno.
- Detalles: los escenarios del fondo que cambian algo; plurales; los seguros que ya están en el presupuesto se reconocen; la inversión se pliega cuando no hay nada que invertir; el presupuesto ordena las categorías como la plantilla; espacio al final de las pantallas del caso para el botón del asistente.

## Consecuencias

- Una columna nueva (`debts.in_arrears`) y cuatro parámetros de Colombia con fuente (migración `debt_arrears_co_parameters`). La tasa de usura cambia cada mes: el procedimiento para cargar la del mes siguiente está en `supabase/README.md`.
- **Supuestos:** el semáforo del cliente usa las referencias de la sección 7 del protocolo (G16); "cerca de la usura" es a 3 puntos o menos (G15); el borrador de la carta es un punto de partida que el asesor corrige (G17).
- Las entregas anteriores se ven con el orden nuevo; lo que no guardaron no se muestra.
- El borrador del aviso de privacidad 1.2 ya no nombra la pensión; sigue sin publicar (G4).

## Alternativas consideradas

- **Un reporte distinto para el cliente y otro para el asesor:** duplica pantallas y deja de ser cierto que "el asesor ve lo que ve el cliente".
- **Semáforo con umbrales por país:** el protocolo da referencias generales; si un país las necesita distintas, se vuelven parámetros con fuente.
- **Generar la carta con el asistente de IA:** depende de la clave y de los avisos de tratamiento (G4); el borrador fijo con marcadores funciona sin enviar datos a nadie.
