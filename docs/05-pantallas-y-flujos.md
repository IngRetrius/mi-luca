# 05. Pantallas y flujos

## 1. Principios de diseño

| Principio | Cómo se aplica |
|---|---|
| Una mano | Acciones principales abajo (botón fijo sobre la navegación inferior); formularios en hojas que suben desde abajo; nada importante en la esquina superior |
| Objetivos táctiles | Mínimo 44 x 44 puntos, por encima del mínimo de 24 x 24 px de WCAG 2.2 [F31] |
| Formularios cortos | Un bloque por pantalla; guardado por bloque; nunca un formulario de 20 campos |
| Números | Teclado decimal (`inputmode="decimal"`), formato de moneda del país al salir del campo, tamaño de fuente de 16 px o más en campos para que Safari no haga zoom |
| Monedas | Cada campo de dinero tiene un selector de moneda pegado al importe: primero la moneda base, luego las que el cliente ya usa y al final un buscador de todas las monedas ISO 4217. Si la moneda no tiene tasa, el formulario pide la tasa en el mismo paso. Las listas muestran el importe original y los totales en moneda base |
| Semáforo accesible | Color, icono y texto a la vez ("Bien", "Atención", "Alerta"); el color nunca es el único medio [F31] |
| Conexión lenta | Primera vista renderizada en servidor, esqueletos de carga, sin imágenes pesadas, JavaScript por ruta |
| Movimiento | Entrar a algo desliza la pantalla hacia adelante y volver, hacia atrás; los botones, los desplegables, los avisos y el asistente responden con movimiento corto; la moneda cae una vez en el inicio del cliente. Nada se mueve con "reducir movimiento" (ADR 0031) |
| Sin conexión | Aviso visible; el último plan entregado se puede leer; la edición espera la conexión |
| Claridad profesional | Cada proyección dice "Ilustrativa, no garantizada"; cada tema de impuestos, pensión o sucesión muestra a qué profesional se remite |
| Moneda de hoy | Etiqueta fija "Cifras en pesos de hoy" o "Cifras en euros de hoy" en resúmenes y proyecciones |
| Tema | Claro y oscuro con los tokens de [diseno/tokens.md](diseno/tokens.md) |
| Todos los dispositivos | Primero el celular. Desde 768 px, columna de lectura de 672 px y botones de la barra fija en fila a la derecha; desde 1024 px, las pantallas de resumen ponen en rejilla los elementos pares (ADR 0023) |
| Dos idiomas | Español e inglés con los mismos textos; cada persona elige en Entrar, la invitación, su inicio o Privacidad y datos (el asesor, en Clientes). Cifras con el formato del país en los dos (ADR 0022) |
| Tema claro u oscuro | Automático (sigue al equipo), Claro u Oscuro; cada persona elige junto al idioma, en los mismos lugares y en el pie del landing. Se recuerda en el equipo y la página llega ya con su tema (ADR 0033) |

## 2. Navegación

**Cliente** (barra inferior de 5 destinos):

```
┌────────────────────────────────────────────┐
│  Inicio   Mi plan   Mis datos   Control  Más │
└────────────────────────────────────────────┘
```

"Más" agrupa: Tareas, Créditos (si tiene), Historial, Privacidad y datos, Cerrar sesión.

**Asesor** (barra inferior de 4 destinos): Clientes, Avisos, Parámetros, Cuenta. Dentro de un cliente, la barra cambia a: Resumen, Datos, Análisis, Entrega, Más, con la fase actual visible arriba.

## 3. Flujo del asesor: una asesoría completa

### 3.1 Asesoría en tres etapas (ADR 0025)

El asesor no pide todo de una vez. Primero llena el núcleo (perfil, ingresos, monedas y supuestos) y después trabaja una etapa a la vez, cada una con su propio reporte:

| Etapa | Qué se registra | Qué recibe el cliente |
|---|---|---|
| Datos básicos (núcleo, siempre activo) | Perfil y tipo de cliente; ingresos con su tipo | Nada aparte: lo usan las tres etapas |
| 1. Presupuesto y bolsillos | Gastos (desde el catálogo), cuentas y saldos (activos líquidos, ADR 0028), bancos y bolsillos, prueba de realidad; si aplican, meses sin ingreso y cobros | Reporte con cómo va el plan (sobrante, tasa de ahorro y fondo, con semáforo), la tabla de bolsillos con lo que se pasa cada mes y el año del flujo |
| 2. Deudas | Saldo, tasa y cuota de cada deuda; si tiene cuotas atrasadas o reportes negativos | Reporte con cómo va el plan (sobrante y carga de deuda), orden de pago, salida de cada deuda e intereses |
| 3. Patrimonio, protección y metas | Patrimonio, seguros, metas y perfil de riesgo | Reporte con patrimonio neto, suma asegurada, aporte a cada meta e inversión ilustrativa |

El déficit del año pide nota en cualquier entrega; deudas pide además explicar una cuota que no cubre intereses o cuotas atrasadas, y patrimonio exige que el aporte de cada meta tenga bolsillo (ADR 0028). En la ficha (P-A03), cada etapa activa muestra sus pasos, que se marcan solos con los datos, y el primero pendiente como acción principal. Los opcionales (cuentas, bolsillos, prueba de realidad, deudas, patrimonio, seguros, metas y perfil de riesgo) se pueden omitir y cuentan como hechos; con todos hechos u omitidos, la etapa dice "Etapa terminada" (ADR 0029). El orden sugerido es 1, 2, 3; un cliente que llega por sus deudas puede empezar por la 2. Con deuda cara, la etapa 3 avisa que la inversión espera. Ocultar una etapa no borra sus datos ni los saca del cálculo. Para cada etapa se sigue el mismo ciclo del protocolo: registrar, analizar, proponer, controlar, entregar y hacer seguimiento.

### 3.2 Fases del protocolo

```mermaid
flowchart TD
  A1[P-A02 Nuevo cliente] --> A2{¿Invitar ahora?}
  A2 -->|Sí| A3[Invitación enviada]
  A2 -->|No| A4
  A3 --> A4[P-A04 Fase 1: cuestionario por bloques A a G]
  A4 --> A5[P-A05 Fase 2: tipo de cliente y reglas]
  A5 --> A6[P-A06 Fase 3: presupuesto normalizado]
  A6 --> A7[P-A07 Fase 4: aclaraciones pendientes]
  A7 --> A8[P-A08 Fase 5: prueba de realidad]
  A8 --> A9[P-A09 Fase 6: diagnóstico con semáforo]
  A9 --> A10[P-A10 Fase 7: análisis por módulo]
  A10 --> A10b[P-A25 Propuesta: ajustes que el cliente decide]
  A10b --> A11[P-A12 Fase 9: control de calidad]
  A11 -->|Bloqueantes| A10
  A11 -->|Sin bloqueantes| A12[P-A13 Fase 10: notas y carta]
  A12 --> A13[P-A14 Entregar plan]
  A13 --> A14[P-A15 Fase 11: ajustes y antes y después]
  A14 --> A15[P-A16 Fase 12: seguimiento 30, 90 días y anual]
  A15 -->|Cambios del cliente| A14
```

La fase 8 del protocolo (llenar el Excel) desaparece: los datos viven en la plataforma y el Excel es una exportación (P-A18).

| Fase del protocolo | Pantalla | Qué hace el asesor |
|---|---|---|
| 1. Cuestionario | P-A04 | Captura por bloques A a G durante o después de la entrevista. Cada campo acepta "estimado" y "por confirmar" |
| 2. Tipo de cliente | P-A05 | Elige tipo; la pantalla muestra las reglas que se aplican (meses de fondo, ingreso base, prima, cesantías) |
| 3. Procesamiento | P-A06 | Revisa el presupuesto normalizado, clasifica, marca esenciales y pagador |
| 4. Aclaraciones | P-A07 | Ve los campos "por confirmar" y el banco de preguntas; copia un mensaje numerado para enviar al cliente |
| 5. Prueba de realidad | P-A08 | Escribe saldos de hace N meses y de hoy; ve el estado y el % a inversión que resulta |
| 6. Diagnóstico | P-A09 | Revisa indicadores con semáforo; escribe fortalezas y puntos de atención |
| 7. Análisis | P-A10, P-A11 | Flujo, bolsillos, fondo, deudas, metas, seguros, inversión, cobros, costo de vida, lista para contador y abogado (la pensión se remite al profesional, ADR 0016) |
| 7. Análisis (recomendaciones) | P-A25 | Arma la propuesta: ajustes a los gastos con su porqué, comparados con el plan de hoy; anota qué acepta el cliente y aplica lo aceptado, que crea sus tareas; lo pendiente sigue en una propuesta nueva (ADR 0024) |
| 9. Control de calidad | P-A12 | Ve bloqueantes y advertencias; justifica advertencias con nota |
| 10. Carta de cierre | P-A13 | Redacta notas y carta con cifras enlazadas; previsualiza como el cliente |
| Entrega | P-A14 | Congela la versión, genera el PDF y avisa al cliente |
| 11. Ajustes | P-A15 | Ve la tabla de antes y después de cada cambio (suyo o del cliente) |
| 12. Seguimiento | P-A16 | Compara con el plan entregado, programa revisiones, genera la ficha de continuidad |

## 4. Flujo del cliente

```mermaid
flowchart TD
  C1[Correo de invitación] --> C2[P-C01 Invitación]
  C2 --> C3[P-C02 Consentimiento]
  C3 --> C4[P-C12 Crear tu acceso: Google o contraseña]
  C4 --> C4b[P-C13 Tus documentos: extractos para la videollamada]
  C4b --> C5[P-C03 Agregar a inicio]
  C5 --> C6[P-C04 Inicio]
  C6 --> C7[P-C05 Mi plan]
  C6 --> C8[P-C06 Mis datos]
  C8 --> C9[P-C07 Editar un dato con vista previa del impacto]
  C9 --> C10[Aviso al asesor con antes y después]
  C6 --> C11[P-C08 Control mensual]
  C6 --> C12[P-C09 Tareas]
  C6 --> C13[P-C11 Privacidad y datos]
```

## 5. Lista de pantallas

### 5.1 Generales

| Id | Pantalla | Contenido |
|---|---|---|
| P-G01 | Entrar | Marca, "Continuar con Google", formulario de correo y contraseña (permite pegar y gestores de contraseñas), enlace "Olvidé mi contraseña", texto "El acceso es por invitación de tu asesor", enlaces a privacidad y términos. Con `?aviso=cuenta-borrada`, "Se borraron la cuenta y todos sus datos" (ADR 0034) |
| P-G02 | Sin invitación | Explica que la cuenta existe pero no tiene perfil; opción de cerrar sesión; la cuenta se borra en 7 días |
| P-G03 | Navegador no compatible | Versión mínima (Safari 16.4 [F15]) y cómo actualizar |
| P-G04 | Sin conexión | Qué se puede ver y qué no |
| P-G05 | Recuperar contraseña | Tres pasos: correo, código de 6 dígitos recibido por correo y nueva contraseña. Todo dentro de la app. El mensaje es el mismo exista o no la cuenta, para no revelar qué correos están registrados (ADR 0009) |
| P-G06 | Landing (`/` sin sesión, ADR 0026) | Página pública para quien llega por recomendación, hecha para quien no lee todo: títulos que dicen el mensaje y una o dos líneas por bloque. Cabecera con la marca y Entrar; presentación con el título, la moneda y la ranura de la marca, una línea, los dos botones de contacto (Escríbeme por WhatsApp y Pedir una primera conversación, cada uno con su mensaje) y la línea de confianza; las tres etapas con su reporte al lado (capturas con un caso inventado); cómo trabajo y qué pasa con los datos, con el alcance en letra pequeña y el enlace al aviso; sobre mí; cinco preguntas plegables; cierre; pie con el alcance, el aviso de privacidad, Entrar, el correo del responsable, el idioma y el tema. En el celular, el botón de WhatsApp fijo abajo al bajar. Animaciones cortas en CSS que se apagan con "reducir movimiento". Sin formularios ni analítica, y sin hablar de precio. Con sesión, `/` sigue al inicio de cada rol |
| P-G07 | Privacidad pública (`/privacidad`, ADR 0026) | Los avisos vigentes de cada país habilitado (tratamiento de datos y datos de salud), con versión y fecha, como en P-C02; el correo del responsable para consultar, corregir o borrar. Abre con o sin sesión; los avisos existen solo en español y en inglés se avisa |

### 5.2 Cliente

| Id | Pantalla | Contenido |
|---|---|---|
| P-C01 | Invitación | Nombre del asesor, qué es la plataforma (planificación y educación financiera), qué no es (no recomienda productos), qué datos se piden y cuáles nunca, botón continuar |
| P-C02 | Consentimiento | Texto de tratamiento de datos del país (versión y fecha), casilla obligatoria; casilla aparte para datos de salud si el presupuesto los incluye; enlace a la política completa |
| P-C03 | Agregar a inicio | Instrucciones según el sistema: en iPhone, Compartir y luego "Agregar a inicio"; en Android, botón "Instalar" (evento `beforeinstallprompt`). Opción "Ahora no" |
| P-C04 | Inicio | Saludo con el tratamiento elegido; si el plan está listo o en preparación, con el enlace a Mi plan (o a las notas publicadas antes de la entrega); botón "Registrar el gasto de este mes"; "Cómo va tu plan" con los indicadores del último reporte y su semáforo (ADR 0028); próximas 3 tareas; enlaces a Mis datos y a Privacidad y datos; idioma y tema; cerrar sesión |
| P-C05 | Mi plan | Con reportes de varias etapas, arriba se elige el último de cada una (ADR 0025). El reporte, en el orden en que se usa (ADR 0028): el mensaje del asesor (resumen de la carta) abierto; las próximas tareas; "Cómo va el plan" con indicadores, semáforo, una frase sin jerga y la referencia del protocolo; la tabla de bolsillos con lo que se pasa cada mes y el total; el plan de deudas; patrimonio, metas e inversión; el resto de la carta en secciones plegables y las notas; "Comparar con hoy"; y, plegado, "Todas las cifras y supuestos". Descargar PDF y versiones anteriores. La misma vista la ve el asesor, sin las tareas |
| P-C06 | Mis datos | Módulos editables con su total, agrupados en datos básicos (Ingresos, Monedas) y las etapas que el asesor activó: presupuesto (Gastos, Tus cuentas y saldos, Bancos y bolsillos, Lo que le deben, Prueba de realidad), deudas y patrimonio (Lo que tiene, Seguros, Metas, Inversión) (ADR 0025 y 0028) |
| P-C07 | Editar un dato | Hoja inferior con el formulario; debajo, "Así cambia tu plan" con las cifras clave antes y después, calculadas en el teléfono |
| P-C08 | Control mensual | Selector de mes; por categoría: presupuesto, campo del gasto real, barra de desviación; total del mes |
| P-C09 | Tareas | Lista del plan de acción; tocar para marcar hecha; filtro pendientes y hechas |
| P-C10 | Créditos | Tarjeta por crédito con próxima cuota, fecha y estado; marcar pagada con fecha; panel con deuda total y fecha de libertad |
| P-C11 | Privacidad y datos | Retirar o restablecer el acceso del asesor, ver consentimientos, "Borrar mi cuenta" con enlace a P-C14 (ADR 0034), cerrar sesión. Exportar mis datos llega en F7 |
| P-C12 | Crear tu acceso | Después del consentimiento: "Continuar con Google" o "Crear contraseña" con el correo de la invitación fijo, contraseña con indicador de longitud mínima y opción de mostrarla (ADR 0009) |
| P-C12 | Historial | Cambios por fecha, quién los hizo y su efecto en las cifras |
| P-C13 | Tus documentos (`/documentos`) | Primer paso después de aceptar la invitación (ADR 0030): qué subir (extractos de tarjetas, cuentas y créditos y soportes de ingreso de los últimos 3 meses), quién los ve y cuándo se borran, tapar los números; tipo de documento y "Elegir archivos" (PDF, JPG o PNG de hasta 10 MB; en el celular, también una foto; un extracto con clave, sin clave si se puede o así, y se abre junto con el asesor en la videollamada: nunca se pide la clave); lo subido con su vencimiento, "Ver" y "Borrar". Abajo, "Continuar" o "Lo hago después" hacia P-C03. Después, desde el inicio |
| P-C14 | Borrar mi cuenta (`/privacidad-y-datos/borrar`) | Qué se borra (datos, reportes, documentos, historial y la cuenta de acceso), que el asesor deja de verlo y que no se puede deshacer; casilla "Entiendo que se borra todo" y "Borrar mi cuenta para siempre". Se borra de inmediato y lleva a Entrar con el aviso; el asesor recibe "Un cliente borró su cuenta", sin el nombre (ADR 0034) |

### 5.3 Asesor

| Id | Pantalla | Contenido |
|---|---|---|
| P-A01 | Clientes | Buscador; tarjetas con nombre, país, estado (borrador, invitado, activo o inactivo), fase actual, próxima revisión, marca de cambios nuevos. Con perfiles inactivos, pestañas "Activos" e "Inactivos" con su número (`?ver=inactivos`); los inactivos dicen desde cuándo. Tras borrar un perfil, "Se borró el perfil" (ADR 0034) |
| P-A02 | Nuevo cliente | Nombre visible, país (define moneda y módulos), tú o usted, correo para la invitación (opcional) |
| P-A03 | Ficha del cliente | Datos básicos (con "Revisar los documentos del cliente", ADR 0030) y las tres etapas con sus pasos (los opcionales se omiten, ADR 0029), el siguiente paso como acción principal, sus pantallas y activar u ocultar; carta y entrega; seguimiento; cifras de las etapas activas; invitación (ADR 0025); estado del perfil: "Desactivar perfil" con su explicación, "Borrar perfil" solo si nadie lo aceptó. Un perfil inactivo muestra arriba "Perfil inactivo" con la fecha y "Reactivar perfil", y no se puede invitar (ADR 0034) |
| P-A04 | Cuestionario por bloques | Pasos A a G; en cada campo, marca "estimado" y "por confirmar" |
| P-A05 | Tipo de cliente | Selector y reglas que se activan |
| P-A06 | Presupuesto | Partidas agrupadas por categoría con total mensual; icono en filas incompletas; alta rápida; filtros por tipo, pagador y esencial |
| P-A24 | Asistente (botón flotante) | En todas las pantallas de un cliente, solo para el asesor (ADR 0017). Abre un chat: el asesor escribe lo que cuenta el cliente y el agente lo anota en el plan con las reglas de cada pantalla; cada guardado aparece como una tarjeta con Ver y Deshacer, y pregunta lo que falte. No calcula ni recomienda productos. En el celular ocupa la pantalla; en escritorio queda abajo a la derecha. La conversación no se guarda |
| P-A06b | Gastos típicos | Catálogo del país por categoría (`packages/i18n/src/budget-catalog/`): se marca lo que el cliente gasta, con valor opcional (y días si va por duración); lo marcado se guarda con la frecuencia, el tipo, el bolsillo y el esencial sugeridos, y el bolsillo que falta se crea. Lo que ya está se ve sin casilla. Al final, recordatorio de lo que más se olvida (protocolo, prueba de realidad). Es el punto de partida con el presupuesto vacío. El cliente la tiene en Mis gastos. Solo para el asesor, el asistente con Claude (ADR 0012): notas escritas o dictadas, propuesta con la cita de cada gasto, y "Marcar en la lista" sin guardar |
| P-A07 | Aclaraciones | Campos por confirmar y preguntas sugeridas; "Copiar mensaje" |
| P-A08 | Prueba de realidad | Tres campos, resultado y efecto en el % a inversión |
| P-A09 | Diagnóstico | Indicadores con semáforo; campos de fortalezas y puntos de atención |
| P-A10 | Análisis | Pestañas: Flujo, Bolsillos, Fondo, Deudas, Metas, Seguros, Inversión, Cobros, Profesionales. Sin pensión: la plataforma no la analiza (ADR 0016) |
| P-A26 | Documentos del cliente | Lo que subió el cliente para la videollamada (ADR 0030): tipo, formato, tamaño, fecha y vencimiento; "Ver" abre el archivo en otra pestaña con un enlace de 60 segundos; "Ya los revisé, borrarlos" con confirmación. No van al asistente ni al plan entregado |
| P-A27 | Borrar perfil (`/clientes/[id]/borrar`) | Solo perfiles que nadie aceptó (ADR 0034): qué se borra, que no se puede deshacer, escribir el nombre del perfil para confirmar (sin distinguir mayúsculas ni espacios de más) y "Borrar para siempre". Un perfil con dueño explica que solo esa persona lo borra y que se puede desactivar |
| P-A25 | Propuesta del asesor | Solo el asesor (ADR 0024). Ajustes a los gastos (cambiar el valor o quitar) con su porqué; "Partir del nivel básico"; cifras clave de hoy frente a la propuesta y, en cada ajuste, lo que cambia ese gasto al mes; decisión del cliente por ajuste; "Aplicar lo aceptado" con su confirmación; propuestas aplicadas |
| P-A11 | Costo de vida | Tres niveles por partida; el asesor edita el básico; totales por pagador y sin temporales |
| P-A12 | Control de calidad | Resultado de `qualityChecks` filtrado por la etapa que se entrega (los comunes y los de la etapa; todos en el plan completo): bloqueantes, advertencias, nota por advertencia |
| P-A13 | Notas y carta | Editor por secciones; botón "Insertar cifra"; vista como el cliente; publicar notas |
| P-A14 | Entregar un reporte | Qué se entrega (una etapa activa o el plan completo, en la URL `?etapa=`), control de calidad de esa etapa, nombre de la versión ("Deudas, 8 de octubre de 2026" por defecto), reportes ya entregados |
| P-A15 | Cambios | Registros de antes y después, agrupados; filtro por actor |
| P-A16 | Seguimiento | Comparación con el plan entregado; revisiones a 30, 90 días y anual; ficha de continuidad |
| P-A17 | Parámetros | Por país: clave, valor vigente, desde, fuente, fecha de consulta; "Nueva versión" |
| P-A19 | Monedas del cliente | Monedas en uso, tasa que recibe el cliente, fecha, nota; sensibilidad por moneda. Al registrar una, se elige de un menú con las comunes (código y nombre) o "Otra moneda" con su código. Al elegirla, y al editar una ya registrada, aparece la tasa oficial del día con su fuente y su fecha (TRM o Banco Central Europeo); "Usar esta tasa" la copia con su fecha y su nota para ajustarla a la que recibe el cliente (ADR 0032). El cliente ve lo mismo en Mis datos |
| P-A18 | Exportar | Excel compatible, carta en PDF, ficha de continuidad |

## 6. Wireframes en texto

Ancho de referencia: 390 px (iPhone de 6,1 pulgadas). `[ ]` son botones; `( )` campos; `▸` elementos plegables.

### P-C04 Inicio del cliente

```
┌──────────────────────────────────────┐
│ Hola, Ana                            │
│ Tu plan está listo.                  │
│ [          Ver tu plan          ]    │
│ [ Registrar el gasto de este mes ]   │
├──────────────────────────────────────┤
│ Cómo va tu plan                      │
│ Lo que queda al año   19.300.000     │
│ ✓ Bien                               │
│ Tasa de ahorro             30 %      │
│ ✓ Bien                               │
│ Fondo de emergencia        100 %     │
│ ✓ Bien                               │
├──────────────────────────────────────┤
│ Tus próximas tareas                  │
│ Crear los bolsillos                  │
│ Antes del 8 nov. 2026                │
│ Ver todas las tareas                 │
├──────────────────────────────────────┤
│ Mis datos · Privacidad y datos       │
└──────────────────────────────────────┘
```

### P-C07 Editar un gasto (hoja inferior)

```
┌──────────────────────────────────────┐
│ ▬▬▬                                  │
│ Editar gasto                  [ X ]  │
│ Concepto      (Mercado             ) │
│ Valor   [COP ▾] (130.000           ) │
│ Frecuencia                           │
│ [Semanal] [Mensual] [Anual] [Otra ▾] │
│ ¿Quién lo paga?                      │
│ [Yo] [Mi familia] [Otra persona]     │
│ ¿Es esencial?               (●  )    │
│ Nota          (                    ) │
├──────────────────────────────────────┤
│ Así cambia tu plan                   │
│ Gasto al mes   5.436.000 → 5.502.000 │
│ Sobrante al año 19,3 M → 18,5 M      │
├──────────────────────────────────────┤
│ [          Guardar cambios         ] │
└──────────────────────────────────────┘
```

### P-C08 Control mensual

```
┌──────────────────────────────────────┐
│ Control mensual     [◂ Octubre 2026 ▸]│
├──────────────────────────────────────┤
│ Alimentación                         │
│ Presupuesto 1.100.000                │
│ Real        (1.240.000     )  +13 % ▲│
├──────────────────────────────────────┤
│ Transporte                           │
│ Presupuesto 420.000                  │
│ Real        (380.000       )  -10 %  │
├──────────────────────────────────────┤
│ ...                                  │
├──────────────────────────────────────┤
│ Total del mes  5.210.000 de 5.436.000│
│ [            Guardar mes           ] │
└──────────────────────────────────────┘
```

### P-C03 Agregar a inicio (iPhone)

```
┌──────────────────────────────────────┐
│ Ten tu plan a un toque               │
│                                      │
│ 1. Toca el botón Compartir  [⬆]      │
│    en la barra de Safari.            │
│ 2. Elige "Agregar a inicio".         │
│ 3. Toca "Agregar".                   │
│                                      │
│ Después abre MiLuca desde tu         │
│ pantalla de inicio y entra de nuevo  │
│ con tu cuenta (es un paso único).    │
│                                      │
│ [          Ya la agregué           ] │
│ [             Ahora no             ] │
└──────────────────────────────────────┘
```

El texto "entra de nuevo con tu cuenta" responde a que iOS no comparte la sesión de Safari con la app instalada [F4].

### P-C11 Privacidad y datos

```
┌──────────────────────────────────────┐
│ Privacidad y datos                   │
├──────────────────────────────────────┤
│ Tu asesor               ● Con acceso │
│ [ Retirar acceso ]                   │
├──────────────────────────────────────┤
│ [ Descargar todos mis datos ]        │
│   JSON y Excel. Enlace válido 7 días │
├──────────────────────────────────────┤
│ Consentimientos                      │
│ Tratamiento de datos  v1.0  12/10/26 │
│ Datos de salud        v1.0  12/10/26 │
├──────────────────────────────────────┤
│ Borrar mi cuenta                     │
│ Borrar mi cuenta y mis datos ▸       │
├──────────────────────────────────────┤
│ [ Cerrar sesión ]                    │
└──────────────────────────────────────┘
```

### P-A01 Clientes del asesor

```
┌──────────────────────────────────────┐
│ Clientes                     [ + ]   │
│ (Buscar                            ) │
├──────────────────────────────────────┤
│ Cliente CO             ● Activo      │
│ Colombia · Fase 12 · Revisión 24 dic │
│ 2 cambios nuevos del cliente         │
├──────────────────────────────────────┤
│ Clienta ES             ● Activo      │
│ España · Fase 10 · Carta en borrador │
├──────────────────────────────────────┤
│ Cliente nuevo          ○ Invitado    │
│ Invitación enviada hace 2 días       │
├──────────────────────────────────────┤
│ Clientes  Avisos  Parámetros  Cuenta │
└──────────────────────────────────────┘
```

### P-A03 Ficha del cliente

```
┌──────────────────────────────────────┐
│ ◂ Clientes                           │
│ Cliente CO · Colombia · COP          │
├──────────────────────────────────────┤
│ Datos básicos                        │
│ ✓ Completar el perfil         Hecho  │
│ ✓ Registrar los ingresos      Hecho  │
├──────────────────────────────────────┤
│ Etapa 1. Presupuesto y bolsillos     │
│ 3 de 6 pasos                         │
│ ✓ Registrar los gastos        Hecho  │
│ ✓ Registrar cuentas y saldos  Hecho  │
│ ✓ Organizar bancos y bolsillos Hecho │
│ ○ Hacer la prueba de realidad        │
│                     Pend.   Omitir   │
│ ○ Resolver el control de calidad     │
│ ○ Entregar el reporte                │
│ [ Hacer la prueba de realidad ]      │
│ Presupuesto · Bolsillos · Flujo …    │
│ Ocultar la etapa                     │
├──────────────────────────────────────┤
│ Etapa 2. Deudas                      │
│ Sin activar. Lo que ya tiene         │
│ registrado sigue contando.           │
│ [ Activar la etapa ]                 │
├──────────────────────────────────────┤
│ Etapa 3. Patrimonio … (sin activar)  │
├──────────────────────────────────────┤
│ Carta y entrega · Seguimiento        │
│ Cifras de las etapas activas         │
│ Invitación                           │
├──────────────────────────────────────┤
│ Estado del perfil                    │
│ Activo: aparece en tu lista.         │
│ ▸ Desactivar perfil                  │
│ Borrar perfil (solo si nadie aceptó) │
└──────────────────────────────────────┘
```

### P-A27 Borrar perfil (`/clientes/[id]/borrar`, ADR 0034)

Solo para un perfil que nadie aceptó; uno con dueño explica que solo esa persona lo borra y que se puede desactivar. Los botones van en el contenido, no en la barra fija: en una pantalla tan corta, el asistente la taparía.

```
┌──────────────────────────────────────┐
│ ◂ Volver a la ficha                  │
│ Borrar perfil                        │
│ Se borra para siempre todo lo de     │
│ este perfil. No se puede deshacer.   │
│ Escribe el nombre del perfil para    │
│ confirmar                            │
│ Tal como aparece: Cliente nuevo      │
│ (                                  ) │
│ [ Borrar para siempre ]              │
│ Cancelar                             │
└──────────────────────────────────────┘
```

### P-C14 Borrar mi cuenta (`/privacidad-y-datos/borrar`, ADR 0034)

```
┌──────────────────────────────────────┐
│ ◂ Privacidad y datos                 │
│ Borrar mi cuenta                     │
│ Se borra para siempre todo lo tuyo y │
│ tu asesor deja de verlo.             │
│ Qué se borra                         │
│ • Tus datos  • Tus reportes          │
│ • Tus documentos  • El historial     │
│ • Tu cuenta de acceso                │
│ [ ] Entiendo que se borra todo y que │
│     no se puede deshacer.            │
├──────────────────────────────────────┤
│ [ Borrar mi cuenta para siempre ]    │
│ Volver                               │
└──────────────────────────────────────┘
```

### P-A10 Análisis: Flujo anual

```
┌──────────────────────────────────────┐
│ Análisis   [Flujo][Bolsillos][Fondo]▸│
├──────────────────────────────────────┤
│ Flujo 2027 · pesos de hoy            │
│ Ene  -3.831.803  ● rojo  usa bolsillo│
│ Feb  +2.118.197  aporta 348.346      │
│ Mar  +2.118.197  aporta 348.346      │
│ ...                                  │
├──────────────────────────────────────┤
│ Meses sin ingreso                    │
│ Faltante 3.831.803 · Aporte igual    │
├──────────────────────────────────────┤
│ Destino del sobrante                 │
│ Inversión 50 % · Margen 50 %         │
│ (prueba de realidad pendiente)       │
└──────────────────────────────────────┘
```

Las cifras de los wireframes son ilustrativas (toman la sección 15 del protocolo).

### P-A25 Propuesta del asesor

En el celular, una columna; desde el escritorio, la comparación a la derecha y los ajustes a la izquierda.

```
┌──────────────────────────────────────┐
│ ◂ Ficha del cliente                  │
│ Propuesta                            │
│ Ajustes al presupuesto para mostrar  │
│ en la sesión. El cliente decide cada │
│ uno; nada cambia hasta aplicarlos.   │
├──────────────────────────────────────┤
│ Hoy → Con la propuesta  Ilustrativo  │
│ Gasto al mes      4.850.000 4.550.000│
│ Sobrante al año   1.800.000 5.400.000│
│ Tasa de ahorro         4 %      12 % │
│ Deuda cara         38 meses 29 meses │
├──────────────────────────────────────┤
│ Ajustes (3)        [Agregar ajuste]  │
│ Salidas · Mensual                    │
│ 200.000 → 150.000                    │
│ 50.000 menos de gasto al mes         │
│ "Dos salidas menos y llegas al viaje"│
│ ( Pendiente | Acepta | Descarta )    │
│ ──────────────────────────────────── │
│ Suscripción B · Mensual · Quitar     │
│ 45.000 menos de gasto al mes         │
│ ( Pendiente | Acepta | Descarta )    │
│ [Partir del nivel básico]            │
├──────────────────────────────────────┤
│ Propuestas aplicadas                 │
│ 05/10/2026 · 2 ajustes · sobrante    │
│ 1.800.000 → 4.900.000 al año         │
├──────────────────────────────────────┤
│ [ Aplicar lo aceptado (2) ]          │
└──────────────────────────────────────┘
```

"Aplicar lo aceptado" lleva a una confirmación: qué gastos cambian o se borran, cuántas tareas se crean para el cliente, qué pasa a una propuesta nueva (lo pendiente) y qué queda solo en el registro (lo descartado). Agregar o editar un ajuste es un formulario aparte: el gasto (agrupado por categoría, con su valor de hoy), cambiar el valor o quitarlo, el valor nuevo por pago y el porqué.

### P-A13 Notas y carta

```
┌──────────────────────────────────────┐
│ ◂ Carta de cierre        Borrador    │
├──────────────────────────────────────┤
│ ▸ Resumen ejecutivo                  │
│ ▾ 1. Cómo estás hoy                  │
│   Tu sobrante anual es de            │
│   [cifra: sobrante anual 19.300.000] │
│   y tu tasa de ahorro, de            │
│   [cifra: tasa de ahorro 30 %].      │
│   [ Insertar cifra ]                 │
│ ▸ 2. Lo que estás haciendo bien      │
│ ▸ ...                                │
├──────────────────────────────────────┤
│ [ Ver como el cliente ] [ Guardar ]  │
└──────────────────────────────────────┘
```

Las cifras son marcadores enlazados al motor: si un dato cambia, la cifra cambia. Al entregar el plan, se congelan. "Proponer un borrador" llena solo las secciones vacías de la carta con un texto inicial de las etapas activas, con sus marcadores y en el trato del cliente; fortalezas y puntos de atención quedan al criterio del asesor (ADR 0028).

### P-A14 Entregar un reporte

```
┌──────────────────────────────────────┐
│ ◂ Ficha del cliente                  │
│ Entregar un reporte                  │
├──────────────────────────────────────┤
│ Qué vas a entregar                   │
│ ( ) Presupuesto y bolsillos          │
│ (●) Deudas                           │
│ ( ) Plan completo                    │
├──────────────────────────────────────┤
│ Control de calidad                   │
│ ✓ Los meses sin ingreso, cubiertos   │
│ ✓ Todos los ingresos tienen tipo     │
│ ✓ Todas las monedas tienen su tasa   │
│ ✓ Cada cuota cubre sus intereses     │
│ ✓ Sin cuotas atrasadas               │
├──────────────────────────────────────┤
│ Reportes entregados                  │
│ Presupuesto y bolsillos, 8 oct 2026  │
├──────────────────────────────────────┤
│ Va con el plan: carta · notas        │
├──────────────────────────────────────┤
│ Nombre (Deudas, 8 de octubre de 2026)│
│ [        Entregar el reporte       ] │
└──────────────────────────────────────┘
```

## 7. Estados y mensajes comunes

| Situación | Mensaje |
|---|---|
| Proyección | "Ilustrativa, no garantizada. Cifras en [moneda] de hoy." |
| Tema de impuestos | "Confírmalo con tu contador" (Colombia) o "con tu gestor o asesor fiscal" (España) |
| Tema pensional | "Confírmalo con tu administradora de pensiones" o "con la Seguridad Social" |
| Tema sucesoral | "Consúltalo con un abogado o notaría" |
| Inversión | "Esta plataforma no recomienda productos ni entidades" |
| Guardado sin conexión | "Sin conexión. Tus cambios no se guardaron; inténtalo cuando vuelvas a tener señal." |
| Dato con cuenta o tarjeta | "Parece un número de cuenta o tarjeta. No lo necesitamos: escribe solo el nombre del banco." |
