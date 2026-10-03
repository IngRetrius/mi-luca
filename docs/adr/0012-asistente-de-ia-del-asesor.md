# 0012. Asistente de IA del asesor con Claude Haiku

- Estado: Aceptada
- Fecha: 2026-10-02

## Contexto

El asesor pidió el 02/10/2026 una IA para él, no para el cliente, que se active con un botón y le ayude a tomar notas y decidir durante la asesoría. Primero la quiso estrictamente en su Mac; ese mismo día, después de probarla con un modelo local, decidió usar Claude (`07-preguntas-abiertas.md`).

Restricciones:

- Los datos del cliente incluyen datos de salud (C20) y clientes de España, cuya transferencia fuera de la UE sigue pendiente (A7). Supabase y Vercel ya son encargados en Estados Unidos con cláusulas contractuales tipo [F23][F41].
- Reglas del repositorio: el motor es puro y es el único que calcula (regla 5); la interfaz no recomienda productos ni entidades (regla 11); no se guardan números de cuenta ni documentos (regla 9); las claves secretas solo viven en módulos `server-only` (regla 8).

## Decisión

Claude Haiku 4.5 (`claude-haiku-4-5`) [F56], llamado desde una acción de servidor de la app con el SDK oficial y salida estructurada [F57]. El primer uso es un asistente de captura en la lista de gastos típicos (P-A06b): el asesor escribe o dicta sus notas, Claude propone conceptos de la lista con el valor, la frecuencia y la cita de las notas que lo respalda, la app valida la respuesta y marca la lista, y el asesor revisa y guarda con la acción de siempre.

Reglas del asistente:

1. **Solo el asesor.** El botón no existe en las pantallas del cliente y la acción rechaza a cualquier otro rol.
2. **Lo mínimo sale de la app.** A Claude van solo las notas del asesor y la lista de conceptos del país, que es pública: ni nombre, ni identificador, ni cifras guardadas del cliente. La pantalla pide no escribir nombres ni números de cuenta.
3. **No se guarda nada.** Las notas no se escriben en la base ni en registros; el campo no tiene `name` y no viaja con el formulario de la lista.
4. **Propone, no escribe.** La respuesta solo marca casillas y llena valores en el formulario. Guardar sigue siendo del asesor y pasa por la validación y el registro del antes y después de siempre.
5. **No calcula.** Copia el valor y la frecuencia que se dijeron. Si la frecuencia no es la de la lista, marca el concepto sin valor y lo avisa; los días de un gasto por duración los escribe el asesor. Los cálculos siguen en el motor.
6. **Salida estructurada y validada.** Esquema JSON cerrado con las llaves de la lista y temperatura 0. La app vuelve a validar: descarta llaves desconocidas, valores fuera de rango y frecuencias inválidas. La lista se arma en el servidor, no se recibe del navegador.
7. **Sin recomendaciones.** Las instrucciones lo prohíben y la respuesta no tiene un campo de texto que llegue al cliente.
8. **La clave `ANTHROPIC_API_KEY` vive solo en el servidor** (`features/assistant/claude.ts`, `server-only`). Sin ella, el asistente avisa que no está configurado.

Datos [F58]: Anthropic actúa como encargado bajo su DPA, incorporado a los términos comerciales con cláusulas contractuales tipo; no entrena con los datos de la API; borra entradas y respuestas en 30 días, salvo lo que sus sistemas de seguridad marquen, que puede guardar hasta 2 años. La retención cero solo existe para cuentas calificadas. Los avisos de tratamiento de datos pasan a la versión 1.1 para nombrar a Anthropic (migración `legal_texts_1_1`).

## Consecuencias

- Responde en segundos y funciona en cualquier equipo, también en el iPhone y en Safari. No hay nada que instalar en el Mac.
- Costo estimado por propuesta: unos 2.000 tokens de entrada y 450 de salida, del orden de 0,004 USD con Haiku 4.5 (1 y 5 USD por millón) [F56].
- Un encargado más y avisos 1.1. Para España, la transferencia sigue la misma vía que Supabase y Vercel (A7 sigue abierta).
- Las notas pueden traer datos de salud ("paga psicólogo"): quedan bajo el mismo consentimiento de salud y no se guardan.
- El asesor crea la cuenta y la clave en la consola de Anthropic y la pone en Vercel (Production) como variable sensible.
- Siguientes pasos, con las mismas reglas (propone y el asesor confirma): preguntas de aclaración por fase (P-A07), borrador de las notas del asesor (P-A13, donde Sonnet 5.5 puede valer la diferencia de precio) y captura de ingresos y deudas.

## Alternativas consideradas

- **Ollama en el Mac del asesor, llamado desde su navegador** (la primera decisión). Se construyó y se probó el 02/10/2026 con notas inventadas y `qwen2.5:32b`: acertó los 7 gastos de la lista y separó el que no estaba, pero cada propuesta tardó entre 2,3 y 3,5 minutos aun con el modelo entero en la GPU; con el contexto por defecto de Ollama (32.768 tokens) no cabía en la GPU y no respondía en 5 minutos [F51][F52]. Además solo servía en ese Mac, en Chrome o Edge con permiso de red local [F53] (Safari bloquea `http://127.0.0.1` desde una página https [F54]) y con `OLLAMA_ORIGINS` configurado. Un modelo de 12 a 14 mil millones de parámetros [F55] habría sido más rápido, pero con las mismas limitaciones de equipo y navegador. Descartada por el asesor a cambio de un encargado más.
- **Claude Sonnet 5.5.** Doble precio sin mejora para elegir entre conceptos de una lista cerrada; queda para tareas que piden criterio.
- **Modelo dentro del navegador o extensión.** Descargas pesadas, modelos pequeños y soporte desigual, o desarrollo y distribución aparte.
