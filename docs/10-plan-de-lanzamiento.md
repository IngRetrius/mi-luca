# 10. Plan de lanzamiento por etapas

Fecha: 08/10/2026. Desde hoy, este plan fija el orden del trabajo que queda hasta el piloto con personas cercanas y hasta empezar a cobrar. Sale de la [auditoría de lanzamiento](09-auditoria-de-lanzamiento.md) y del [ADR 0025](adr/0025-asesoria-por-etapas.md). Lo que queda de F7 y F8 en [06-plan-de-trabajo.md](06-plan-de-trabajo.md) pasa a la fase L5 de este plan, salvo lo que se adelanta aquí.

## 1. Decisiones de partida

| Decisión | Consecuencia |
|---|---|
| El servicio es gratis para personas cercanas; se cobrará más adelante (A6, actualizada el 08/10/2026) | Vercel Hobby sirve mientras sea gratis [F12]. Supabase sigue en el plan gratuito durante el piloto, con copia semanal. Los dos pasan a Pro antes del primer cobro (L4) |
| La asesoría va en tres etapas con su propio reporte (ADR 0025) | Núcleo común más presupuesto y bolsillos, deudas, y patrimonio con protección y metas |
| Sin funciones nuevas antes del piloto | Solo lo de este plan. Lo que pidan los primeros clientes se anota y se decide después de L3 |

## 2. Fases

| Fase | Objetivo | Horas (**Supuesto**) | Estado al 08/10/2026 | Para pasar a la siguiente |
|---|---|---|---|---|
| L0. Higiene y seguridad | Cerrar los riesgos de la auditoría que no dependen de las etapas | 8 | Hecha en el código; quedan tareas del asesor | `pnpm audit --prod` sin avisos, borrado probado, primera copia guardada |
| L1. Asesoría por etapas | Construir ADR 0025 con las pantallas que ya existen | 40 | Sin empezar | Criterios de la sección 4 |
| L2. Preparar el piloto | Probar todo en producción con datos inventados y dejar listo el guion de cada etapa | 8 | Sin empezar | Caso inventado entregado y borrado en producción |
| L3. Piloto | Atender a 3 a 5 personas cercanas, empezando por la etapa 1 | 6 a 8 semanas de calendario | Sin empezar | Lista de ajustes del piloto aplicada |
| L4. Antes de cobrar | Planes pagados, dominio, términos y obligaciones al cobrar | 16 más trámites | Sin empezar | Todo lo de la sección 7 |
| L5. Resto de F7 y F8 | Excel, correos, exportación, accesibilidad manual, rendimiento | Las horas de F7 y F8 en 06 | Pendiente | Criterios de F7 y F8 en 06 |

**Supuesto:** a 14 horas por semana, L1 y L2 toman unas tres semanas y media y el piloto puede empezar a comienzos de noviembre de 2026. Con el agente de código las fases anteriores avanzaron mucho más rápido que la estimación (06, sección 2.1), así que es un techo.

## 3. L0. Higiene y seguridad

- [x] Next.js y `eslint-config-next` 16.3.8; `source-map-js` 1.2.2. `pnpm audit --prod` sin avisos (08/10/2026) [F62]. Queda `braces` en la herramienta de lint (desarrollo, sin versión corregida); no llega a producción.
- [x] Sin la cabecera `x-powered-by` (`poweredByHeader: false`).
- [x] Borrado a pedido del cliente: `private.delete_client_data` con su prueba pgTAP y el procedimiento en `supabase/README.md` (H5).
- [x] Procedimiento de copia semanal en `supabase/README.md`, comprobado contra la base local (H1).
- [x] Documentación desactualizada: `README.md` y P-C04 en `05-pantallas-y-flujos.md` (H11).
- [ ] **Asesor:** subir las dos migraciones que faltan en el remoto con `pnpm supabase db push --dry-run` y después `pnpm supabase db push`: `proposals` (falta desde el 05/10/2026, así que la Propuesta del asesor falla hoy en producción; H13) y `client_data_deletion`. El ensayo del 08/10/2026 muestra solo esas dos.
- [ ] **Asesor:** sacar la primera copia del remoto y guardarla cifrada.
- [ ] **Asesor:** mover `client_secret_*.json` fuera de la carpeta del repositorio (H10).
- [ ] **Asesor:** autorizar el MCP de Supabase (`claude mcp login`) para revisar el asesor de seguridad del remoto después del despliegue.
- [ ] **Asesor:** decidir si el repositorio sigue público (A10b en 07).

Al desplegar, comprobar en `mi-luca.vercel.app` que la respuesta ya no trae `x-powered-by`.

## 4. L1. Asesoría por etapas (ADR 0025)

Cada paso es un cambio con sus pruebas, en este orden:

1. **Datos.** Migración con `case_settings.active_stages` (valores `presupuesto`, `deudas`, `patrimonio`; por defecto `{presupuesto}`; solo la cambia el asesor, con la guarda de columnas que ya usan los supuestos) y `plan_deliveries.stage` (`presupuesto`, `deudas`, `patrimonio` o `completo`; por defecto `completo`; dentro del sello `sha256`). Los clientes que ya existen quedan con las tres etapas: la migración crea su fila de `case_settings` si no la tienen. Pruebas pgTAP: el cliente no cambia sus etapas, el asesor sí, valores fuera del catálogo se rechazan, la entrega guarda su etapa y no se cambia. `pnpm db:types`.
2. **Dominio y glosario.** `CaseStage` y su esquema en `packages/domain`; términos nuevos en `glosario.md` (etapa, etapas activas, núcleo, etapa de la entrega).
3. **Mapa de etapas en la app.** Qué módulo va en qué etapa y qué controles de calidad aplican a cada una (tabla del ADR 0025), con pruebas unitarias.
4. **Ficha del asesor (P-A03).** Núcleo, las tres etapas y Seguimiento, con las mismas tarjetas. Una etapa sin activar se ve plegada con "Activar" y una línea que aclara que sus datos, si los hay, siguen contando en el cálculo. Las cifras de la columna lateral son las de las etapas activas.
5. **Mis datos (P-C06).** Agrupado igual, solo con las etapas activas.
6. **Entrega (P-A12 y P-A14).** Elegir la etapa (las activas o el plan completo); el control de calidad muestra los controles de esa etapa y los comunes; el nombre por defecto dice la etapa y la fecha.
7. **Plan entregado (P-C05, vista del asesor y PDF).** Solo las secciones de su etapa; sección de deudas nueva con lo que la entrega ya guarda (`results.debtPlan`, `results.expensiveDebt`); en Mi plan, la última entrega de cada etapa.
8. **Formulario de gasto.** Concepto, valor, frecuencia y esencial a la vista; el resto en "Más detalles", abierto si alguno tiene error o valor distinto del sugerido.
9. **Textos.** Claves nuevas en `es.json` y `en.json`, con su versión en `es-ES.json` y `es-usted.json` donde el cliente las vea; la prueba de claves iguales pasa.
10. **Documentación.** `05-pantallas-y-flujos.md` (P-A03, P-A12, P-A14, P-C05, P-C06 y el flujo del asesor), `03-modelo-de-datos.md` (sección 11).
11. **Extremo a extremo.** El asesor entrega la etapa 1 y el cliente la ve en Mi plan; una entrega de la etapa 2 muestra las deudas; Mis datos solo muestra las etapas activas.
12. **Revisión de interfaz.** Cada pantalla cambiada pasa por `web-design-guidelines` (regla 12).
13. **Asesor:** `pnpm supabase db push`.

Criterios de aceptación:

- Un cliente nuevo con el núcleo, sus gastos y sus bolsillos recibe un reporte de presupuesto sin haber tocado deudas, patrimonio ni inversión, y el control de calidad no le pide el perfil de riesgo.
- Un cliente con solo el núcleo y sus deudas recibe un reporte de deudas con el orden de pago y el mes en que queda sin deudas.
- Las entregas anteriores se ven como antes, más la sección de deudas.
- `ENGINE_VERSION` y las pruebas de oro no cambian.
- `pnpm format:check`, `lint`, `typecheck`, `test`, `test:db`, `build` y `test:e2e` pasan.

## 5. L2. Preparar el piloto

- [ ] **Caso inventado en producción**, con una cuenta de prueba: invitación enviada por mensaje, consentimiento, crear acceso, instalar en iPhone y en Android, núcleo y etapa 1, entrega, Mi plan, PDF y un mes de control mensual. Al terminar, borrarlo con `private.delete_client_data`.
- [ ] **Agente de captura (G4):** publicar los avisos 1.2 (el asesor revisa los borradores de `docs/legal/textos/`, luego `python3 tools/legal-texts/build_migration.py --write` y `db push`) o no usarlo con clientes reales. Recomendación: publicarlos antes del piloto si se va a usar en las sesiones; el asistente de notas ya está cubierto por 1.1.
- [ ] **Supuestos que se confirman antes de clientes reales:** G2 (gastos de salud del catálogo) y B16 (edad de retiro; solo importa en la etapa 3). G5 se revisa con el primer cliente que lleve el control mensual.
- [ ] **Qué pedir antes de cada etapa**, con las preguntas del protocolo (sección 3) repartidas por etapa:

  | Etapa | Bloques del cuestionario | Qué traer a la sesión |
  |---|---|---|
  | Núcleo | A (perfil, salvo la pregunta 9 de pensión) y B (ingresos) | Valor y frecuencia de cada ingreso |
  | 1. Presupuesto y bolsillos | C (gastos), 16 (cuentas), 21 (prueba de realidad) y 28 (banco de los bolsillos) | Gastos con valor y frecuencia, mejor con los extractos de 2 o 3 meses; cuánto tenía ahorrado hace 3 o 6 meses y cuánto tiene hoy |
  | 2. Deudas | D (deudas) | Saldo, tasa, cuota y cuotas pendientes de cada deuda |
  | 3. Patrimonio, protección y metas | 17 a 20 (patrimonio), F (protección) y 25 a 27 (metas y perfil de inversión) | Valor de inmuebles, vehículos e inversiones; seguros que tiene; metas con valor y fecha |

- [ ] **Mensaje de invitación** fuera de la app: qué es (planificación y educación financiera, gratis por ahora), qué no es (no recomienda productos ni entidades, las cifras son ilustrativas) y qué datos nunca se piden. P-C01 dice lo mismo dentro de la app.

## 6. L3. Piloto

- **Quiénes:** 3 a 5 personas cercanas con perfiles distintos, por ejemplo un empleado y un contratista, con deudas y sin ellas (**Supuesto**). Una persona nueva por semana, para no atender a todas a la vez.
- **Cómo:** todas empiezan por el núcleo y la etapa 1. La etapa 2 solo si tienen deudas; la 3 cuando la 1 esté entregada.
- **Objetivo:** la primera entrega en dos sesiones o menos (**Supuesto**).
- **Qué se observa:** cuánto tardó cada etapa, qué campos no entendieron, qué preguntaron, qué partes del reporte usaron y qué pasó en la revisión a 30 días con el control mensual. Las notas del asesor quedan fuera del repositorio; en `07-preguntas-abiertas.md` solo entran las lecciones generales, sin datos de nadie (regla 4).
- **Cada semana:** copia de seguridad; comprobar que el proyecto de Supabase no se pausó (se pausa tras una semana sin actividad [F1]); revisar avisos y tareas vencidas.
- **Salida:** una lista de ajustes de textos y pantallas (sin funciones nuevas) aplicada, y la decisión sobre G7 (gastos de solo algunos meses) y G11 (segunda versión de la propuesta).

## 7. L4. Antes de cobrar

| Tarea | Por qué | Costo al mes |
|---|---|---|
| Vercel Pro | Hobby excluye cualquier uso con ganancia económica [F12] | 20 USD [F11] |
| Supabase Pro | Copias diarias, sin pausa por inactividad y rechazo de contraseñas filtradas (E5) [F1]. Antes si el piloto pasa de 5 personas | 25 USD [F1] |
| Dominio propio (D3), marca en Google (D5) y correo de la app con el dominio (A7c) | Los clientes ven MiLuca en la pantalla de Google y los correos no salen de una cuenta personal | 1 a 2 USD de dominio (**Supuesto**, 06 sección 6); el correo, gratis hasta 3.000 al mes [F25] |
| Términos de uso y alcance del servicio (`legal/README.md`, sección 3), con qué incluye cada etapa y su precio | Lo que el cliente compra tiene que estar escrito | 0 |
| Obligaciones al cobrar como persona natural (registro tributario, facturación) | La plataforma no lo resuelve: se consulta con un contador en Colombia y con un asesor fiscal en España (regla 11) | Según el profesional |
| Transferencia de datos de clientes de España a Estados Unidos (A7) | Decisión del responsable antes del primer cliente de España | 0 |
| Restauración de una copia probada en staging (F8) | Saber que la copia sirve antes de depender de ella | 0 |

Total aproximado con planes pagados: unos 45 USD al mes más el dominio (06, sección 6).

## 8. L5. Lo que queda de F7 y F8

Se prioriza con lo que muestre el piloto:

- **F7:** Excel compatible (P-A18), correos de invitación y de cambios (C6, C14), exportación de datos en P-C11, tareas y gasto real desde el agente de captura (ADR 0017).
- **F8:** revisión manual con VoiceOver y TalkBack, carga en 4G lenta, política de seguridad de contenido (CSP), textos legales finales y migración de los clientes que hoy se atienden con el Excel.

## 9. Riesgos de este plan

| Riesgo | Mitigación |
|---|---|
| Datos reales sin copias diarias durante el piloto | Copia semanal cifrada; Supabase Pro si el piloto crece o antes del primer cobro |
| El proyecto se pausa si nadie entra en una semana | Revisión semanal; se restaura desde el panel |
| Ocultar una etapa no la saca del cálculo y puede confundir (por ejemplo, deudas registradas que sí pesan en el presupuesto) | La tarjeta plegada lo dice; el asesor lo explica en la sesión |
| El asesor atiende a varios a la vez y se retrasa | Una persona nueva por semana |
| Lo que pidan los amigos empuja funciones nuevas antes de tiempo | Se anota en 07 y se decide después de L3 |
