# 12. Plan de mejoras tras la revisión del asesor

Fecha: 09/10/2026. Sale de la revisión de extremo a extremo que hizo el agente con criterio de asesor financiero el mismo día: un caso inventado (contratista de 34 años con un mes sin contrato, 19 gastos del catálogo, tres deudas, patrimonio, perfil de riesgo y una meta), las tres etapas entregadas, el PDF, la invitación y Mi plan en el celular, contra Supabase local. El asesor pidió arreglar todo lo encontrado, mejorar lo que recibe el cliente y lo que haga falta para un producto profesional.

Este plan va antes de L2 en [10-plan-de-lanzamiento.md](10-plan-de-lanzamiento.md): el piloto empieza con estos arreglos hechos.

## 1. Hallazgos

| N.º | Hallazgo | Por qué importa |
|---|---|---|
| R1 | La prueba de realidad solo mira hacia un lado: con un ahorro esperado de −725.000 al mes y uno real de +166.667, queda "Confirmada" y el control de calidad dice que no hay gastos sin registrar | Si el cliente ahorra mucho más de lo que dice el plan, el presupuesto está inflado (o falta un ingreso) y el diagnóstico de déficit es falso. El protocolo habla de "la diferencia" mayor a 15 % (sección 6.2) |
| R2 | El reporte de deudas se entrega con "Todo en orden" aunque el año cierre en déficit | El plan de pago supone que el cliente paga todas sus cuotas cada mes; con déficit, eso no se sostiene |
| R3 | Cuando el sobrante no completa el fondo (o ya está completo), el reporte vuelve al aporte de 12 meses de la plantilla: "Fondo de emergencia: 1.809.444 al mes" a un cliente que pierde 725.000 al mes | El cliente recibe una instrucción que no puede cumplir y que contradice el plan secuencial (ADR 0008) |
| R4 | El saldo líquido que reparte la etapa 1 se registra en Patrimonio, que es de la etapa 3 y está oculta en un cliente nuevo; la prueba de realidad pide aparte "ahorro total hoy" | Con solo la etapa 1, el fondo queda en 0 % y el reparto vacío; el asesor escribe la misma cifra dos veces |
| R5 | El PDF trae la carta y una lista de cifras, sin la tabla de bolsillos ni el plan de deudas con sus cuotas; Mi plan es el panel del asesor: la carta plegada, 15 cifras sin referencia y supuestos técnicos | Lo accionable (qué bolsillos crear, cuánto pasar, qué pagar primero) no llega claro al cliente |
| R6 | La capacidad sugiere "No" en "ingresos variables o contrato inestable" para una contratista con un mes sin contrato | El perfil de riesgo por defecto queda más alto de lo que el protocolo indica (8.7.1) |
| R7 | La ficha y el reporte muestran "Meta del fondo 7,3 M" junto a "Avance 13,6 %": la meta es la vigente y el avance es sobre la meta completa | Dos cifras que no cuadran a la vista |
| R8 | El formulario de metas trae "Sin bolsillo" por defecto y no deja crear el bolsillo ahí; eso bloquea el plan completo, y una entrega de la etapa 3 sola no lo detecta | Fricción y un control que se escapa entre etapas |
| R9 | Deudas sin tasa de usura de referencia ni marca de cuotas atrasadas o reportes negativos | El protocolo los pide (8.3, pasos 1 y 10; pregunta 15) |
| R10 | Colombia no tiene umbrales fiscales publicados (UVT) | El protocolo pide la lista para el contador con los topes para declarar renta (8.9) |
| R11 | La carta llega en blanco en cada etapa; solo el alcance se completa solo | Mucho trabajo repetido para el asesor en cada entrega |
| R12 | Detalles: el escenario "pierde las rentas" para quien no tiene rentas; "1 meses"; Seguros no reconoce los seguros que ya están en el presupuesto; el botón "Asistente" tapa "Crear enlace de invitación" en escritorio; con "no invertir todavía" la inversión muestra 16 filas en 0; el presupuesto ordena las categorías alfabéticamente; en un caso vacío el avance del fondo dice 100 % | Ruido y descuido visibles |
| R13 | El borrador del aviso de privacidad 1.2 nombra la pensión entre los datos que se usan (ADR 0016 la sacó) | Texto legal que no dice lo que hace la app |

## 2. Principios del plan

- El modo compatible no cambia: las pruebas de oro siguen iguales. Lo que mueve un resultado del motor va en modo nativo, con el ADR 0027 y pruebas propias.
- Lo que solo cambia qué se muestra o qué se exige en cada etapa va en la app, con el ADR 0028, que actualiza el 0025.
- Lo que recibe el cliente se ordena por lo que hace con ello: primero el mensaje del asesor y lo que tiene que hacer; después las cifras con su referencia; al final el detalle técnico.
- Toda cifra externa entra en `fuentes.md` con URL y fecha; los textos nuevos van en español e inglés, con su versión de España y de usted donde los ve el cliente.

## 3. Pasos

Cada paso es un cambio con sus pruebas. Se marca al terminar.

### Fase M. Motor (ADR 0027, modo nativo, `ENGINE_VERSION` 0.17.0)

- [x] **M1. Prueba de realidad de dos lados (R1).** Estado nuevo `revisar_presupuesto` cuando el ahorro real supera el esperado en más de 15 % de su valor absoluto; mientras tanto se invierte el porcentaje de prueba pendiente. El control `reality_check_confirms` pide nota en los dos sentidos y dice cuál. Modo compatible igual que la plantilla.
- [x] **M2. Capacidad con contrato inestable (R6).** La condición sugerida es "Sí" para independiente con ingresos variables, para contratista y para quien tiene un ingreso laboral con algún mes sin pago.
- [x] **M3. Controles de deudas (R2, R9).** `debt_payment_covers_interest` (la cuota no alcanza para los intereses del mes: la deuda no baja; pide nota) y `debt_in_arrears` (hay cuotas atrasadas o reportes negativos: pide nota con el acuerdo de pago). La deuda lleva `inArrears`.

### Fase D. Datos

- [x] **D1. Cuotas atrasadas (R9).** Columna `debts.in_arrears` con su permiso de escritura, prueba pgTAP y tipos.
- [x] **D2. Parámetros de Colombia (R9, R10).** Tasa de usura de consumo y ordinario de octubre de 2026 (Superfinanciera) y topes para declarar renta del año gravable 2026 en pesos (UVT de la DIAN), con fuente y fecha.

### Fase E. Etapas y reportes coherentes (ADR 0028)

- [x] **E1. Cuentas y saldos en la etapa 1 (R4).** Paso "Registrar cuentas y saldos" y tarjeta "Cuentas y saldos" en la etapa 1, en la ficha y en Mis datos; la prueba de realidad muestra lo registrado hoy en cuentas e inversiones para usarlo.
- [x] **E2. Controles por etapa (R2, R8).** El déficit del año pide nota en todas las entregas (control común); deudas suma los dos controles nuevos; patrimonio suma los de bolsillos, porque los aportes a metas son bolsillos.
- [x] **E3. Fondo de emergencia en reportes y bolsillos (R3).** Con el plan secuencial: "Se completa en {mes}", "Completo" o "Con el sobrante de hoy no se completa"; nunca el aporte de 12 meses de la plantilla.
- [x] **E4. Cifras del fondo que cuadran (R7).** Las etiquetas dicen qué meta y frente a cuál se mide el avance; sin meta, el avance es "—".
- [x] **E5. Metas con su bolsillo (R8).** La meta nueva crea su bolsillo con su nombre si no se elige uno.
- [x] **E6. Deudas (R9).** Campo "cuotas atrasadas o reportes negativos"; tasa de usura de referencia con su mes y marca "cerca de la usura"; aviso de cuota que no cubre intereses.
- [x] **E7. Umbrales fiscales de Colombia (R10).** Se marcan en el perfil como los de España y se comparan en Costo de vida.
- [x] **E8. Detalles (R12).** Escenarios del fondo que aplican; plurales; seguros del presupuesto reconocidos; botón del asistente sin tapar acciones; inversión compacta cuando no se invierte; categorías en el orden del catálogo.

### Fase C. Lo que recibe el cliente (ADR 0028)

- [x] **C1. Mi plan.** Orden nuevo: el resumen de la carta abierto; "Tus próximos pasos" con las tareas pendientes; "Cómo estás" con cuatro indicadores con semáforo y su referencia (protocolo, sección 7); "Tus bolsillos" con lo que se pasa a cada uno al mes y el total; deudas y metas en frases; la carta completa; al final, plegado, "Cómo se calculó" con todas las cifras y los supuestos.
- [x] **C2. Inicio del cliente.** Los mismos cuatro indicadores y el próximo paso.
- [x] **C3. PDF profesional.** Encabezado con el asesor; resumen; indicadores con referencia; tabla de bolsillos; plan de deudas con cuota y salida; metas; próximos pasos; carta; alcance.

### Fase L. Carta y textos legales

- [x] **L1. Borrador de la carta (R11).** "Proponer un borrador" llena las secciones vacías con un texto inicial de la etapa, con marcadores de cifras, que el asesor corrige.
- [x] **L2. Avisos 1.2 (R13).** Quitar la pensión del borrador; no se publica: lo aprueba el responsable (G4).

### Fase V. Verificación y documentación

- [x] **V1. Documentación.** ADR 0027 y 0028; `04-motor-de-calculo.md`, `05-pantallas-y-flujos.md`, `03-modelo-de-datos.md`, `glosario.md`, `fuentes.md`, `07-preguntas-abiertas.md` y `10-plan-de-lanzamiento.md`.
- [x] **V2. Revisión de interfaz** de cada pantalla cambiada con `web-design-guidelines` (regla 12).
- [x] **V3. Pruebas.** `pnpm format:check`, `lint`, `typecheck`, `test`, `test:db`, `build` y `test:e2e`.
- [x] **V4. Recorrido de nuevo** con el caso inventado contra Supabase local: los 13 hallazgos resueltos.

**Estado al 09/10/2026:** todos los pasos hechos en el código y verificados contra Supabase local: `pnpm format:check`, `lint`, `typecheck`, `test` (1.145 pruebas), `test:db` (495), `build` y `test:e2e` (377) pasan, y el recorrido con el caso inventado muestra resueltos los 13 hallazgos. El ensayo de `db push` solo lista la migración nueva.

## 4. Lo que queda para el asesor

- Subir la migración nueva al remoto (`pnpm supabase db push`) antes de publicar el código.
- Revisar los supuestos nuevos en `07-preguntas-abiertas.md` (G15 a G17).
- Actualizar la tasa de usura cada mes (`supabase/README.md`).
