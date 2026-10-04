# 0017. Agente de captura que anota en el plan del cliente

- Estado: Aceptada (pedido del asesor del 04/10/2026). Reemplaza las reglas 2 y 4 de ADR 0012 para este agente; la propuesta de gastos de P-A06b sigue igual.
- Fecha: 2026-10-04

## Contexto

El asistente de ADR 0012 solo proponía gastos de la lista de P-A06b y el asesor guardaba. El asesor pidió el 04/10/2026 un asistente en un botón flotante que se abre como chat: él escribe lo que el cliente le va contando y el asistente, que conoce los campos de la aplicación, los va agregando. No hace cálculos.

## Decisión

- **Dónde.** Un botón flotante "Asistente" en todas las pantallas de un cliente (`/clientes/[id]/...`, layout del caso), solo para el asesor. El chat vive en el layout: sigue abierto mientras el asesor pasa de una pantalla del caso a otra. En el celular ocupa la pantalla; en escritorio queda acoplado abajo a la derecha.
- **Qué anota.** Trece herramientas, una por cosa: perfil (fecha de nacimiento, sexo, personas a cargo, tipo de cliente), ingresos, gastos, deudas, metas, seguros, activos, inversiones, cobros, bolsillos generales, tasas de cambio, respuestas del perfil de riesgo y prueba de realidad. Cada una crea o, con el id del registro, corrige.
- **Con las reglas de cada pantalla.** El agente no escribe directo en la base: arma lo que dijo como el formulario de esa pantalla y pasa por su mismo validador (`parseIncome`, `parseBudgetItem`, `parseDebt`…), con la sesión del asesor (RLS) y el registro del antes y después (`withImpact`, uno por mensaje). Lo que la pantalla rechaza vuelve al agente con el motivo y no se guarda. No toca el criterio profesional (nivel básico, orden manual de deudas, % de cobros a inversión, condiciones de capacidad, supuestos).
- **Visible y reversible.** Cada cosa guardada aparece en el chat como un renglón con su resumen, un enlace a su pantalla y "Deshacer": un alta se borra y una corrección vuelve a la fila de antes, validada otra vez con la pantalla.
- **No calcula ni inventa.** Copia valores y frecuencias como se dijeron; si falta un dato obligatorio, pregunta. No recomienda productos ni entidades y remite impuestos, pensión y temas legales al profesional (regla 11).
- **Qué va a Claude.** Las notas del asesor y el estado del caso en texto (una línea por registro con su id, sin el nombre del cliente ni datos de contacto), para corregir en vez de duplicar. Va en cada mensaje, dentro de etiquetas, como dato y no como instrucción. La conversación no se guarda en la base: vive en el navegador del asesor mientras está en el caso; "Nueva conversación" la borra.
- **Modelo y API.** `claude-opus-5-5` con esfuerzo medio, porque escribe en datos reales y prima entender notas libres y elegir el campo correcto. Herramientas sin forzar su uso, caché automática del prefijo, respaldo del servidor si el modelo declina (`fallbacks: "default"`) e historial que solo crece (la API rechaza historiales editados). Cada llamada se corta a los 50 s con un reintento y el turno deja de llamar a los 70 s, para devolver lo guardado antes del límite de 120 s de la acción.

## Consecuencias

- Anthropic recibe, además de las notas, el estado del caso (conceptos, montos, deudas, metas…). Los avisos de tratamiento de datos 1.1 dicen que Claude lee las notas del asesor "para proponer qué anotar" en "mis gastos": este uso es más amplio. Hay un borrador 1.2 en `docs/legal/textos/` para que el responsable lo apruebe (pregunta G4).
- Costo estimado por mensaje: unos 10.000 tokens de entrada, casi todos leídos de la caché, y de 200 a 1.500 de salida; del orden de 0,01 a 0,04 USD con Opus 5.5 (4 y 20 USD por millón, caché a 0,20). Medido en local el 04/10/2026: de 7 a 20 s por mensaje.
- Lo que se anota sin revisar puede quedar mal. La mitigación es la tarjeta de cada guardado, "Deshacer", las preguntas del agente cuando algo no cuadra y el antes y después que ve el asesor.
- El asistente de propuesta de gastos de P-A06b (ADR 0012) se mantiene.

## Alternativas consideradas

- **Que proponga y el asesor confirme cada dato (como ADR 0012).** Más control, pero el asesor pidió que el asistente vaya agregando; "Deshacer" y las tarjetas dan el control sin frenar la conversación.
- **Claude Haiku 4.5 (el del asistente anterior).** Más barato, pero aquí elige entre trece herramientas y muchos campos en notas libres, y escribe en el plan real.
- **Guardar la conversación en la base.** Permitiría retomarla, pero guardaría notas libres con posibles datos de salud; no hace falta para anotar.
- **Escribir en las tablas sin los validadores de las pantallas.** Menos código, pero dos reglas distintas para lo mismo; con el validador común, el agente y el asesor guardan igual.
