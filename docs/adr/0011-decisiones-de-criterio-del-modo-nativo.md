# 0011. Decisiones de criterio del modo nativo y del mantenimiento del plan por el cliente

- Estado: Aceptada (el asesor delegó estas decisiones al agente el 02/10/2026, con la instrucción de elegir lo más lógico para una asesoría personalizada en la que, terminada la asesoría, el cliente mantiene sus datos y el plan se recalcula)
- Fecha: 2026-10-02

## Contexto

Quedaban abiertas las preguntas B3 (qué hallazgos se corrigen en modo nativo), B14 (desde qué mes cuenta el plan de ahorro secuencial), B15 (ingresos sin tipo), C20 (datos de salud al retirar ese consentimiento) y la aprobación de varias propuestas. El modo nativo es el que usan los clientes nuevos (B4), así que estas decisiones cambian cifras reales.

Criterios usados, en este orden:

1. **Primero la estabilidad.** El fondo de emergencia va antes que invertir; la práctica de planificación personal lo pone como la primera pieza [F46].
2. **Cada caso es diferente.** Lo que depende de la persona (qué ingreso es estable, quién paga) se marca por cliente, con la regla de la plantilla como valor por defecto [F47].
3. **El cliente mantiene su plan.** Después de la entrega, el cliente edita sus datos (bolsillos, bancos, cobros, patrimonio, prueba de realidad, ingresos y gastos), el plan se recalcula al momento y el asesor ve el antes y después. El plan entregado queda fijo como referencia. El criterio profesional (supuestos, metodología, nivel básico, % de cada cobro a inversión) sigue siendo del asesor.
4. **Minimizar datos sensibles.** Un dato de salud sin consentimiento vigente no se conserva con detalle [F48][F49].

## Decisión

### Plan de ahorro secuencial (B14)

El plan empieza el **mes siguiente a la fecha de corte**, que es cuando el cliente empieza a aplicar lo acordado, igual que la simulación de deudas (`Deudas!C11`). Cada mes usa el sobrante del mismo mes del año del flujo (un año típico) y lo repite hasta completar el fondo. Si el fondo se completa antes del año del flujo, ese año se reparte entero. Con los datos de C2 (España), el fondo se completa en diciembre de 2026 y en 2027 se invierte lo mismo que en la plantilla.

### Escenarios del fondo por ingreso (H-07)

Cada ingreso puede marcarse con el escenario en que se pierde: con el trabajo (A), con las rentas (B), solo en el peor caso (C) o nunca (`ninguno`, un ingreso estable como el aporte fijo de la familia o un arriendo seguro). Sin marca vale la regla de la plantilla por tipo. Solo cuenta en modo nativo. La estabilidad de cada ingreso es lo que define cuánto colchón hace falta [F47].

### Ingresos sin tipo (B15)

Un ingreso sin tipo suma al ingreso anual pero no entra al flujo ni a los escenarios (H-26). La base ya exige el tipo (`incomes.kind`) y el control de calidad lo bloquea si llega a ocurrir.

### Datos de salud al retirar el consentimiento (C20)

Cada gasto puede marcarse "de salud". Si el cliente retira su consentimiento de datos de salud (o lo negó), esos gastos **conservan el importe**, que es un dato económico necesario para el plan, y **pierden el detalle**: categoría "Salud y bienestar", concepto "Salud" y sin nota. La base lo hace al retirar, quita el detalle del historial y aplica lo mismo a los gastos de salud que se registren después. Un perfil sin consentimientos registrados (borrador del asesor) no se toca. Así se cumple que, sin otra base legal, el dato sensible se suprime (RGPD, art. 17.1.b; Ley 1581, art. 8 e) sin romper el plan.

### Correcciones del modo nativo (B3)

| Hallazgo | Decisión | Cuándo |
|---|---|---|
| H-01 Aporte al fondo que no se descuenta | Corregido: plan secuencial (ADR 0008), desde el mes siguiente al corte | Hecho |
| H-02 Gasto tipo bolsillo sin bolsillo | Corregido: aviso en el presupuesto y control que bloquea la entrega; la base no lo exige para no impedir el registro | Hecho |
| H-03 Cuotas de deudas los 12 meses | Corregir: en modo nativo, la cuota sale del flujo desde el mes en que termina la deuda | F4 |
| H-04 Extra a deudas promedio | Documentar; la simulación usa el promedio | F4 |
| H-05 Seguros dentro de la cuota | Corregir: campo de seguros en la deuda | F4 |
| H-06 Dos motores de deudas | Corregir: un solo motor con horizonte, seguros, FRECH y orden manual | F4 |
| H-07 "Otro" se pierde solo en C | Corregido: escenario por ingreso, con la regla de la plantilla por defecto | Hecho |
| H-08 Pensión de Colombia fija | Corregir con parámetros con fuente (B10) | F6 |
| H-09 Desfase de un año en la proyección | Documentar | F5 |
| H-10 Seguro de vida a 10 años | Corregir: años y gasto a cubrir editables por el asesor | F5 |
| H-11 Avance frente a la meta completa | Corregido: se muestran los dos avances | Hecho |
| H-12 Aporte de terceros como ingreso | Corregido: pagador por gasto (ADR 0010, aceptada) | Hecho |
| H-13 Control mensual con ahorro y umbral fijo | Corregir: umbral como parámetro y el ahorro aparte del gasto | F7 |
| H-14 Fecha de corte `=TODAY()` | Corregido: fecha de corte explícita | Hecho |
| H-15 Solo dos monedas | Corregido: multimoneda | Hecho |
| H-16 Ingresos variables solo por tipo | Corregir: sugerido por tipo y editable por el asesor | F5 |
| H-17 Meta que se repite ignora lo ahorrado | Documentar | F5 |
| H-18 Orden avalancha sin el subsidio FRECH | Corregir: mostrar la tasa efectiva para el cliente junto a la nominal | F4 |
| H-19 Escenarios de IBL derivados | Documentar y permitir escribir los tres | F6 |
| H-20 Fechas fijas en el plan de acción | Corregir: tareas sugeridas según los módulos activos del cliente | F7 |
| H-21 Cuotas como un solo gasto | Documentar | F4 |
| H-22 Varios pagos en un mes | Corregido | Hecho |
| H-23 Ingresos promediados en créditos | Corregir: una sola fuente de ingresos | F4 |
| H-24 Seguros en cotización en el presupuesto | Mantenerlos en el presupuesto (el plan supone que se toman) pero mostrarlos aparte como "en cotización" | F5 |
| H-26 Sobrante con partidas o ingresos sin tipo | Reproducir la plantilla y bloquear la entrega hasta corregir los datos | Hecho |
| H-27 Cobro sin saldo | La base exige saldo y cuota; el motor reproduce la plantilla para las pruebas | Hecho |

## Consecuencias

- `ENGINE_VERSION` 0.9.0: cambian resultados del modo nativo (plan secuencial y escenarios del fondo). El modo compatible y las pruebas de oro no cambian.
- Migración `income_scenarios_health_items`: `incomes.lost_in_scenario` admite `ninguno`; `budget_items.is_health` y los disparadores que quitan el detalle de salud.
- El cliente tiene en Mis datos bancos y bolsillos (también el banco del fondo y de meses sin ingreso), lo que le deben, lo que tiene y la prueba de realidad, con las mismas reglas que el asesor salvo el criterio profesional.
- Las pruebas nativas de C2 esperan ahora el fondo completo en diciembre de 2026 y la inversión de 2027 igual a la plantilla.

## Alternativas consideradas

- B14, empezar en enero del año del flujo: ignora los meses entre la asesoría y enero, en los que el cliente ya ahorra, y retrasa la inversión sin motivo.
- C20, borrar los gastos de salud: el plan perdería gastos reales y el sobrante quedaría inflado. Pedir al cliente que los renombre a mano: deja el dato sensible mientras no lo haga.
- H-07, decidir la estabilidad solo por tipo de ingreso: es la limitación que se quiere corregir; un aporte familiar fijo y un trabajo informal pueden ser del mismo tipo y muy distintos en estabilidad.
