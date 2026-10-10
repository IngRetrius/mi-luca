# 0032. Tasa oficial sugerida al registrar una moneda

- Estado: Aceptada (el asesor pidió el 09/10/2026 traer la TRM del momento y elegir la moneda de un menú con las más comunes)
- Fecha: 2026-10-09

## Contexto

Para registrar una moneda (P-A19) había que escribir su código de tres letras y buscar la tasa por fuera. El protocolo pide dos cosas a la vez: buscar la tasa oficial vigente y citar fuente y fecha, y usar la que el cliente realmente recibe en su banco o plataforma. La tasa del cliente vive en `client_fx_rates` con fecha y nota, y el motor convierte solo con ella (CLAUDE.md, regla 10).

El asesor propuso Yahoo Finance o Google. Yahoo Finance no tiene una API pública oficial: hay direcciones no oficiales que dejan de funcionar sin aviso y sus condiciones no permiten este uso. Google Finance no tiene API. Hay dos fuentes oficiales, gratuitas y sin clave:

- **TRM de la Superintendencia Financiera** en datos.gov.co [F81]: pesos por dólar, con los días en que rige. La del día siguiente se publica antes de que empiece a regir.
- **Tasas de referencia del Banco Central Europeo** [F82]: unidades de unas 30 monedas por euro, una vez al día. Siguen apareciendo monedas que ya no publica (el peso argentino desde 2020, el rublo desde 2022), con su última fecha.

## Decisión

- **Menú de monedas.** Al registrar una moneda se elige de un menú con las comunes (`currencies.common`, en su orden), con el código y el nombre en el idioma de la interfaz (`Intl.DisplayNames`). No aparecen la base ni las que ya tienen tasa. "Otra moneda" abre el campo del código de tres letras.
- **Sugerencia, no tasa automática.** Al elegir la moneda aparece su tasa oficial, con la fuente y la fecha, y el botón "Usar esta tasa". El botón copia la tasa, la fecha y la nota ("TRM, Superfinanciera, 9 de octubre de 2026") y deja el foco en la tasa para ajustarla a la que recibe el cliente. Nada se guarda sin que la persona lo haga, y las tasas guardadas no cambian solas. Al editar una moneda ya registrada también aparece la oficial del día, para comparar.
- **Cálculo.** Con el euro de por medio: la base por euro dividida por la moneda por euro. El peso colombiano sale de la TRM y del dólar por euro. El dólar frente al peso es la TRM tal cual. Una tasa que combina dos cotizaciones o más dice "Calculada con…". Se redondea a seis cifras significativas y hasta 8 decimales, como `client_fx_rates`. Una cotización con más de 7 días no se sugiere.
- **Consulta.** El servidor consulta las dos fuentes en paralelo con el caso, con la caché de datos de Next.js (6 horas) y un límite de 5 segundos. Las tasas llegan al formulario como promesa (`use` dentro de `Suspense`), así que el formulario no espera. Si una fuente falla o responde algo raro, no hay sugerencia de esa fuente y la tasa se escribe a mano, como antes. La consulta no lleva datos del cliente.

## Consecuencias

- Código en `apps/web/src/features/currencies/`: `official-rates.ts` (lectura de las fuentes y cálculo, puro y con pruebas), `official-rate-sources.ts` (consulta, solo servidor), `official-rate-views.ts` (textos con el formato del país), `currency-options.ts`, `currency-picker.tsx` y `official-rate-hint.tsx`.
- La validación tiene un error nuevo, `missingCurrency` ("Elige una moneda de la lista."). El agente del asesor (`save_fx_rate`) usa la misma validación y no cambia.
- El motor no cambia: sigue convirtiendo con las tasas del cliente. La sugerencia calcula una tasa para proponerla; no convierte importes.
- Hay sugerencia para el dólar, el euro, el peso colombiano y las monedas del BCE (de las comunes: GBP, MXN, CAD, CHF y BRL). El peso chileno, el sol peruano y el peso argentino no tienen fuente oficial en estas dos: siguen en el menú, sin sugerencia (pregunta G19 en `07-preguntas-abiertas.md`).
- Si una fuente cambia su formato, la sugerencia desaparece sin romper el formulario; las pruebas de `official-rates.test.ts` describen el formato esperado.
- La nota `fx.reference.USD` de `03-modelo-de-datos.md` (una tasa de referencia por país como parámetro) queda reemplazada por esta consulta.

## Alternativas consideradas

- **Yahoo Finance o Google:** sin API oficial, con riesgo de dejar de funcionar y sin una fuente que se pueda citar como oficial.
- **Llenar la tasa sola al elegir la moneda:** más rápido, pero invita a guardar la oficial sin ajustarla, cuando el protocolo pide la que recibe el cliente. Con el botón es un toque más y queda claro que es una referencia.
- **Actualizar las tasas guardadas cada día:** cambiaría las cifras del plan, incluso las de un plan entregado, sin que nadie lo decida.
- **Un parámetro de país con la tasa de referencia (`fx.reference.USD`):** habría que actualizarlo a mano cada día; la consulta da la vigente sin trabajo extra.
- **Todas las monedas del mundo en el menú:** una lista de casi 300 es difícil de recorrer en el celular. Las comunes cubren casi todos los casos y "Otra moneda" cubre el resto.
