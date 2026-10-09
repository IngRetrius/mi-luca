# 09. Auditoría antes de los primeros clientes

Fecha: 08/10/2026. Revisado: `main` en `5817e7e`, la documentación, el sitio publicado (`mi-luca.vercel.app`) y fuentes externas registradas en [fuentes.md](fuentes.md) (F59 a F62).

Esta auditoría busca dejar el producto listo para atender a amigos y personas cercanas **sin agregar funciones nuevas**: reordenar lo que ya existe, cerrar riesgos y quitar fricción.

**Lo que no se verificó en la primera revisión:** las pruebas de extremo a extremo y las pgTAP (necesitan Supabase local con Docker) y el asesor de seguridad del proyecto remoto (el MCP de Supabase no estaba autenticado). Las dos primeras se pasaron después, con la primera ronda de cambios (sección 6); el asesor de seguridad sigue pendiente.

## 1. Resumen

- **El código está sano.** Formato, lint, tipos y build pasan; las 1.059 pruebas unitarias pasan (759 del motor); CI está en verde en el último commit. Las cabeceras de seguridad y HSTS están activas en producción y ningún secreto ni dato de cliente está en git.
- **El problema principal es de producto, no de código.** Hay 126 pantallas. La ficha de un cliente muestra 23 tarjetas y 14 cifras a la vez, y la entrega es una sola: el plan completo. Para un cliente que solo quiere ordenar su presupuesto, eso es demasiado que llenar antes de recibir algo.
- **Propuesta:** dividir la asesoría en **tres etapas independientes, cada una con su propio reporte**: presupuesto y bolsillos, deudas, y patrimonio con protección y metas (sección 2). Todo lo que necesita cada etapa ya existe; el trabajo es agrupar, filtrar y entregar por partes.
- **Antes del primer dato real** hay cinco puntos que resolver (sección 3.1): copias de seguridad de la base, el plan de Vercel si se cobra, la versión de Next.js, los avisos del agente de captura (G4) y cómo se atiende un pedido de borrado.

## 2. Propuesta: asesoría en tres etapas

### 2.1 Por qué tres etapas

- **El protocolo ya ordena así la asesoría.** Su primer principio es "primero la estabilidad, después la protección y al final el crecimiento", y ya parte el cuestionario en dos envíos para que el cliente no reciba 28 preguntas de golpe (protocolo, secciones 2 y 3).
- **La medición de salud financiera usa pilares parecidos.** El FinHealth Score de la Financial Health Network agrupa ocho indicadores en cuatro pilares: gastar, ahorrar, endeudarse y planear [F59]. Las tres etapas cubren esos pilares: gastar y ahorrar (etapa 1), endeudarse (etapa 2), planear (etapa 3).
- **Los asesores ya trabajan por módulos.** La planificación modular parte el plan en piezas independientes, a menudo de uno a tres meses cada una, para atender primero lo urgente [F60].
- **Cada etapa termina en algo que el cliente recibe.** Ver un primer reporte en una o dos sesiones mantiene la motivación. Es la misma idea que hace funcionar la "bola de nieve" en deudas: las victorias pequeñas aumentan la probabilidad de terminar [F61].

### 2.2 Núcleo común (se llena una vez)

Lo necesitan las tres etapas: **Perfil** (tipo de cliente, fecha de corte, fecha de nacimiento), **Ingresos** (con ingreso base y seguridad social si aplican) y **Monedas** (solo si el cliente usa otra moneda). Los **Supuestos del plan** quedan con sus valores por defecto salvo que el asesor los cambie.

### 2.3 Las tres etapas

| | Etapa 1. Presupuesto y bolsillos | Etapa 2. Deudas | Etapa 3. Patrimonio, protección y metas |
|---|---|---|---|
| Pregunta del cliente | ¿A dónde se va mi plata y cómo la organizo? | ¿Cuánto me cuestan mis deudas y cuándo salgo? | ¿Cómo protejo lo que tengo y hacia dónde voy? |
| Qué se llena | Gastos (desde el catálogo del país), bancos y bolsillos, prueba de realidad (dos cifras). Si aplican: meses sin ingreso y cobros que le están pagando | Deudas: nombre, saldo, tasa y cuota. El seguimiento cuota a cuota solo si el cliente quiere llevarlo | Patrimonio, seguros, metas, perfil de riesgo (tres preguntas) e inversiones actuales |
| Pantallas que ya existen | Presupuesto, Costo de vida, Flujo, Fondo, Bolsillos, Prueba de realidad, Cobros, Propuesta | Deudas (tabla, orden de pago, "¿Y si se abona más?"), Panel de créditos, Cuotas | Patrimonio, Seguros, Metas (con la calculadora de viaje), Inversión |
| Qué dice el reporte | Ingreso, gasto, sobrante y tasa de ahorro; costo de vida esencial; meta del fondo y cuándo se completa; aporte de cada bolsillo; meses en rojo del año | Deuda total, carga de deuda, deuda cara y meses para salir de ella, orden de pago (avalancha, bola de nieve o manual) y mes en que queda sin deudas | Patrimonio neto, suma asegurada de vida, aporte mensual de cada meta, perfil y distribución orientativa, proyección marcada como ilustrativa |
| Controles de calidad | Sobrante cuadrado, aportes a bolsillos, reparto dentro de lo disponible, meses sin ingreso cubiertos, partidas completas y con bolsillo, prueba de realidad, terceros contados una vez | Los comunes | Sin inversión con deuda cara, perfil de riesgo, horizonte corto en estabilidad, crecimiento dentro del rango |
| Depende de | Núcleo | Núcleo. Con la etapa 1 hecha, el plan de pago usa el sobrante como abono extra; sin ella, calcula con las cuotas actuales | Núcleo y etapa 1 (lo que se puede invertir sale del sobrante después del fondo). Si hay deuda cara, la etapa 2 primero: el control ya bloquea invertir con deuda cara |

Controles comunes a las tres: ingresos con tipo y monedas con tasa.

Cada etapa se entrega por separado y el cliente la ve en Mi plan apenas se entrega. El orden sugerido es 1, 2, 3, pero un cliente que llega por sus deudas puede empezar por la 2 con solo el núcleo. La carta, las notas, la entrega y el seguimiento sirven a las tres.

**Supuesto:** el fondo de emergencia va en la etapa 1 porque el plan de ahorro secuencial lo llena antes de repartir el sobrante (ADR 0008); sin él, los aportes a bolsillos de la etapa 1 no cuadran. Está anotado como G12 en [07-preguntas-abiertas.md](07-preguntas-abiertas.md).

### 2.4 Qué cambia en la plataforma

Nada de esto agrega cálculos. El motor no cambia sus resultados; solo se elige qué mostrar y qué exigir.

| Cambio | Dónde | Tamaño |
|---|---|---|
| Etapas activas por cliente (el núcleo siempre activo) | Una columna en `case_settings`, con su migración y pruebas pgTAP | Pequeño |
| Ficha del asesor agrupada en núcleo y etapas; las etapas sin activar se muestran plegadas con un botón "Activar" | `clientes/[id]/page.tsx` (las mismas tarjetas, reordenadas) | Pequeño |
| Mis datos del cliente agrupado igual, solo con las etapas activas | `mis-datos/page.tsx` | Pequeño |
| La entrega elige la etapa: el control de calidad muestra solo los controles de esa etapa y los comunes | `features/deliveries` (filtro sobre `qualityChecks`, en la app) y una columna de etapa en la tabla de entregas | Mediano |
| El plan entregado y su PDF muestran solo las secciones de su etapa | `plan-view.tsx`, `plan-figures.ts`, `@miluca/exporters/pdf` | Mediano |
| Sección de deudas en el plan entregado: hoy Mi plan no muestra las deudas aunque la entrega ya guarda el plan de pago (`results.debtPlan`, `results.expensiveDebt`) | `plan-view.tsx` | Pequeño |
| Formulario de gasto: concepto, valor, frecuencia y esencial a la vista; tipo, bolsillo, pagador, temporal, salud, referencia familiar y nota en "Más detalles" (hoy son 17 campos). El de deudas ya pliega el seguimiento | `budget-item-form.tsx` | Pequeño |
| Mi plan con varias entregas: la última de cada etapa, no solo la última en general | `my-plan-screen.tsx`, `deliveries/queries.ts` | Mediano |

La carta no necesita cambios: al entregar solo se guardan las secciones escritas (`features/documents/ready.ts`), así que una carta de etapa ya puede ser corta.

Lleva un ADR (0025, asesoría por etapas) porque cambia la entrega y la navegación, y la actualización de `05-pantallas-y-flujos.md`. Las pruebas de oro no cambian.

**Supuesto:** un cliente que ya tiene un plan entregado completo (si existe alguno en el remoto) queda con todas las etapas activas y su entrega se marca como "completa".

## 3. Hallazgos

### 3.1 Antes del primer dato real

| N.º | Hallazgo | Riesgo | Recomendación |
|---|---|---|---|
| H1 | Supabase en el plan gratuito: sin copias de seguridad y se pausa tras una semana sin actividad [F1] | Perder los datos de un cliente sin forma de recuperarlos; la app caída si nadie entra en una semana | Pasar a Pro (25 USD al mes [F1]) antes del primer cliente, como dice A6. Si se aplaza, como mínimo una copia semanal con `pnpm supabase db dump` guardada fuera del equipo |
| H2 | Vercel Hobby es solo para uso no comercial; cobrar por el servicio que usa el despliegue lo vuelve comercial [F12] | Suspensión del proyecto | Mientras las asesorías sean gratis, Hobby sirve. El día que se cobre la primera, Pro (20 USD al mes [F11]) |
| H3 | Next.js 16.3.6 tiene seis avisos de seguridad, corregidos en 16.3.8 [F62]. El más grave (SSRF en el optimizador de imágenes) no aplica porque la app no usa `images.remotePatterns`; los de caché afectan sobre todo a servidores propios | Bajo hoy, pero se acumula | Subir `next` y `eslint-config-next` a 16.3.8 o superior y pasar todas las pruebas. `source-map-js` (aviso alto) entra por `postcss` dentro de `next`: revisar con `pnpm audit` después de subir y, si sigue, `pnpm update source-map-js` |
| H4 | Los avisos de tratamiento de datos 1.2, que cubren al agente de captura (ADR 0017), siguen en borrador (G4) | Usar el agente con datos reales sin que el aviso que aceptó el cliente lo cubra | No usar el agente de captura con clientes reales hasta publicar 1.2, o publicarlo antes del primer cliente. El asistente de notas sí está cubierto por 1.1 |
| H5 | Un cliente no puede pedir el borrado desde la app y el asesor solo borra perfiles sin dueño; la columna `clients.deletion_requested_at` existe pero nada la usa. La ley le da al titular el derecho a pedir la supresión (Ley 1581, art. 8 [F49]) | No poder atender un pedido de borrado | Sin función nueva: escribir en `supabase/README.md` el procedimiento a mano (qué tablas, en qué orden, cómo borrar la cuenta de Auth) y probarlo en local. El cliente lo pide por el correo de contacto que ya está en los avisos |

### 3.2 En el primer mes

| N.º | Hallazgo | Recomendación |
|---|---|---|
| H6 | La edad de retiro por defecto es la de Colombia, 57 o 62 años según el sexo (B16) | Solo importa en la etapa 3: escribir la edad de cada cliente en Supuestos de inversión |
| H7 | Sin dominio propio (D3): la pantalla de Google muestra el dominio de Supabase y los correos salen de una cuenta de Gmail | Aceptable con amigos. Comprarlo cuando se abra a desconocidos |
| H8 | La respuesta dice `x-powered-by: Next.js` y no hay política de seguridad de contenido (CSP) | `poweredByHeader: false` en `next.config.ts` (una línea). La CSP puede esperar a F8 |
| H9 | El repositorio es público (A10) con el protocolo, las plantillas, el plan y el correo de contacto | Confirmar que se mantiene ahora que el producto se va a mostrar. El código no expone secretos |
| H10 | El archivo `client_secret_*.json` de Google está en la raíz del proyecto. Git lo ignora y nunca se subió | Moverlo fuera de la carpeta del repositorio para que ninguna herramienta lo suba por error |
| H11 | Documentación desactualizada: el `README.md` dice "fase 3 de 8 en curso" (va en F7) y P-C04 promete "4 cifras clave con semáforo" que el inicio del cliente no muestra | Corregir los textos para que digan lo que hace hoy la app, no agregar las cifras |
| H12 | Los textos en inglés no los ha revisado un hablante nativo (G6) | Solo si llega un cliente que prefiera inglés |

### 3.3 Puede esperar

Excel compatible (P-A18), correos de invitación y de cambios (C6, C14) y exportación de datos (P-C11) siguen pendientes en F7. Con amigos no hacen falta: el PDF del plan ya existe y el enlace de invitación se manda por mensaje.

## 4. Lo que ya está bien

- Motor puro con pruebas de oro contra la plantilla y 759 pruebas.
- RLS activado en las 37 tablas de las migraciones, con pruebas pgTAP; la clave secreta solo en módulos de servidor.
- Ningún número de cuenta, tarjeta o documento en el modelo de datos; consentimiento con texto y fecha.
- Límites profesionales en la interfaz: sin productos ni entidades, proyecciones ilustrativas, remisión al profesional.
- El catálogo de gastos por país ya es la vía rápida para llenar el presupuesto: se marca lo que el cliente gasta.
- El motor ya ofrece avalancha, bola de nieve y orden manual para las deudas, lo que permite elegir entre lo más barato y lo más motivador [F61].

## 5. Lista de salida

La lista de salida pasó a [10-plan-de-lanzamiento.md](10-plan-de-lanzamiento.md), fases L0 a L2, con las decisiones del asesor del 08/10/2026: el servicio es gratis por ahora y se cobrará más adelante (A6 actualizada), y la asesoría va en tres etapas (G12, ADR 0025).

## 6. Estado de los hallazgos

Al 08/10/2026, después de la primera ronda de cambios:

| N.º | Estado |
|---|---|
| H1 | Procedimiento de copia semanal en `supabase/README.md`, comprobado contra la base local. Falta que el asesor saque la primera copia del remoto. Supabase Pro antes del primer cobro (L4) |
| H2 | Decidido: Hobby mientras el servicio sea gratis; Pro antes del primer cobro (L4) |
| H3 | Resuelto: Next.js y `eslint-config-next` 16.3.8, `source-map-js` 1.2.2; `pnpm audit --prod` sin avisos. Queda `braces` en la herramienta de lint, sin versión corregida y fuera de producción |
| H4 | Pendiente de decisión en L2 (G4) |
| H5 | Resuelto en el código: `private.delete_client_data` con 13 comprobaciones pgTAP y el procedimiento en `supabase/README.md`. Falta subir la migración al remoto |
| H6 | Pendiente (B16), solo para la etapa 3 |
| H7 | Aceptado para el piloto; dominio en L4 |
| H8 | `x-powered-by` resuelto (`poweredByHeader: false`); la CSP queda para L5 |
| H9 | Pendiente de decisión (A10b) |
| H10 | Pendiente: lo mueve el asesor |
| H11 | Resuelto: `README.md` y P-C04 |
| H12 | Sin cambios (G6) |
| H13 | **Nuevo:** el ensayo de `db push` del 08/10/2026 muestra que al remoto le falta la migración `proposals` (ADR 0024, del 05/10/2026), además de la nueva `client_data_deletion`. El código publicado ya usa sus tablas, así que la Propuesta del asesor falla en producción y su tarjeta en la ficha dice que no se pudo cargar. Se resuelve con `pnpm supabase db push` (L0) |

Verificado el 08/10/2026 con Supabase local: `pnpm format:check`, `lint`, `typecheck`, `test` (1.059 pruebas), `test:db` (474), `build`, `test:e2e` (308) y `supabase db lint` pasan.
