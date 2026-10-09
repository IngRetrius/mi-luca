# 0025. Asesoría en tres etapas, cada una con su reporte

- Estado: Aceptada (el asesor pidió el plan completo el 08/10/2026, tras la auditoría de lanzamiento)
- Fecha: 2026-10-08

## Contexto

La plataforma ya calcula todo lo que calcula la plantilla, pero lo pide de una vez. La ficha del cliente muestra 23 tarjetas y 14 cifras; la entrega es una sola, el plan completo, y Mi plan no muestra las deudas aunque la entrega ya guarda el plan de pago. Para un cliente que llega a ordenar su presupuesto, eso es demasiado que llenar antes de recibir algo (`09-auditoria-de-lanzamiento.md`, sección 2).

El protocolo ya ordena la asesoría por prioridades, "primero la estabilidad, después la protección y al final el crecimiento", y parte el cuestionario en dos envíos para no mandar 28 preguntas de golpe. La medición de salud financiera usa pilares parecidos (gastar, ahorrar, endeudarse, planear) [F59], y los asesores que trabajan por módulos entregan cada tema por separado [F60].

La restricción: sin funciones nuevas y sin cambiar el motor. Todo lo que necesita cada etapa ya existe.

## Decisión

- **Núcleo común y tres etapas.** El núcleo (perfil, ingresos, monedas y supuestos del plan) siempre está activo. Las etapas son `presupuesto` (gastos, bancos y bolsillos, fondo de emergencia, flujo, costo de vida, meses sin ingreso, cobros, prueba de realidad y propuesta), `deudas` (deudas, orden de pago, "¿Y si se abona más?", créditos y panel) y `patrimonio` (patrimonio, seguros, metas e inversión).
- **El asesor activa las etapas de cada cliente** (`case_settings.active_stages`). Un cliente nuevo empieza con `presupuesto`; los que ya existen, con las tres. Desactivar una etapa la oculta en la ficha y en Mis datos, pero **no borra sus datos ni los saca del cálculo**: el motor siempre calcula con todo lo registrado (por ejemplo, las cuotas de las deudas siguen en el presupuesto).
- **Cada entrega es de una etapa o del plan completo** (`plan_deliveries.stage`: `presupuesto`, `deudas`, `patrimonio` o `completo`). Las entregas anteriores a este ADR son `completo`.
- **El control de calidad muestra los controles de la etapa** más los comunes (ingresos con tipo y monedas con tasa). El plan completo usa todos, como hoy. El filtro vive en la app (`features/deliveries`): `qualityChecks` del motor no cambia.

  | Etapa | Controles |
  |---|---|
  | `presupuesto` | `surplus_balances`, `pocket_contributions_match`, `allocation_within_available`, `no_income_covered`, `complete_items`, `items_have_pocket`, `reality_check_done`, `reality_check_confirms`, `third_party_counted_once` |
  | `deudas` | Solo los comunes |
  | `patrimonio` | `no_investment_with_expensive_debt`, `risk_profile_answered`, `short_horizon_in_stability`, `growth_within_range` |

- **El plan entregado y su PDF muestran solo las secciones de su etapa.** `presupuesto`: cifras de ingreso, gasto, sobrante y ahorro, fondo, bolsillos y flujo. `deudas`: deuda total, carga de deuda, deuda cara, orden de pago y mes sin deudas, leídos de `results.debtPlan` y `results.expensiveDebt`, que la entrega ya guarda. `patrimonio`: patrimonio neto, seguros, metas e inversión, con la marca de ilustrativa. `completo`: todo, con la sección de deudas nueva.
- **Mi plan muestra la última entrega de cada etapa.** Una entrega `completo` cuenta como la última de las tres.
- **La carta no cambia:** al entregar ya se guardan solo las secciones escritas, así que una carta de etapa puede ser corta.
- **Orden sugerido, no obligatorio:** 1, 2, 3. Un cliente que llega por sus deudas puede empezar por la etapa 2 con solo el núcleo; el plan de pago calcula con sus cuotas y, cuando la etapa 1 está hecha, suma el sobrante como abono extra (ADR 0015).
- **Supuesto:** el fondo de emergencia va en la etapa 1 porque el plan de ahorro secuencial lo llena antes de repartir el sobrante (ADR 0008); sin él, los aportes a bolsillos de la etapa 1 no cuadran.

## Consecuencias

- El cliente recibe su primer reporte después de llenar el núcleo y la etapa 1, no después de todo el cuestionario.
- Dos columnas nuevas con migración y pruebas pgTAP: `case_settings.active_stages` (solo la cambia el asesor) y `plan_deliveries.stage` (dentro del sello del plan entregado). Sin tablas nuevas.
- La ficha del asesor y Mis datos se reagrupan con las mismas tarjetas; el formulario de gasto pliega lo que no es esencial en "Más detalles".
- `ENGINE_VERSION` y las pruebas de oro no cambian.
- Hay que actualizar `05-pantallas-y-flujos.md` (P-A03, P-A12, P-A14, P-C05, P-C06), `03-modelo-de-datos.md` y el glosario al implementarlo.

## Implementación (08/10/2026)

- `features/stages` en la app: catálogo de controles, cifras y supuestos por etapa; pasos de cada etapa (`stageSteps`), que se marcan solos con los datos; la sección de cada etapa en la ficha y el botón de activar u ocultar.
- Pasos: núcleo (tipo de cliente; ingresos clasificados); presupuesto (gastos, bancos y bolsillos, prueba de realidad); deudas (deudas; tasa y cuota de cada una); patrimonio (patrimonio, seguros revisados, metas, perfil de riesgo). Todas terminan en "Resolver el control de calidad", que solo se marca con el núcleo y los datos de la etapa listos, y "Entregar el reporte".
- **Supuesto:** la inversión del año va en las cifras de patrimonio, no en las de presupuesto: depende del perfil de riesgo y de no tener deuda cara, aunque salga del sobrante.
- **Supuesto:** cada reporte muestra solo los supuestos que mueven sus cifras: presupuesto (meses de fondo y colchón), deudas (umbral de deuda cara, sobrante a deudas, excedente del saldo de hoy) y patrimonio (porcentajes a inversión, excedente, edad de retiro y rendimientos).
- La pantalla de entrega propone la primera etapa activa sin entregar; el nombre por defecto es la etapa y la fecha ("Deudas, 8 de octubre de 2026"), que también nombra el PDF.
- El PDF de deudas y de patrimonio suma, en su lista de cifras, el orden de pago con la salida de cada deuda y el aporte de cada meta.
- De paso se corrigió la fecha de entrega: se mostraba en UTC y una entrega de noche en Colombia salía con el día siguiente. Ahora `deliveredOn` es el día en el país del cliente.

## Alternativas consideradas

- **Un asistente paso a paso con todo el cuestionario:** reduce la sensación de desorden, pero el cliente sigue sin recibir nada hasta el final.
- **Dos etapas, como los dos envíos del cuestionario:** la parte 1 del protocolo mezcla gastos y deudas; un cliente sin deudas no tendría un reporte propio de presupuesto, y uno con deudas esperaría al presupuesto completo.
- **Ocultar módulos sin entregas por etapa:** simplifica las pantallas, pero el reporte sigue siendo uno solo.
- **Filtrar los controles en el motor:** cambiaría su salida y pediría pruebas de oro nuevas sin cambiar ningún cálculo; en la app basta.
