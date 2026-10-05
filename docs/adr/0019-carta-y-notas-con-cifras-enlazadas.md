# 0019. Carta de cierre y notas con cifras enlazadas que se congelan al entregar

- Estado: Aceptada
- Fecha: 2026-10-04

## Contexto

La sección 11 del protocolo pide una carta de cierre con cifras "idénticas al Excel", escrita en el trato del cliente y con una estructura fija (resumen, apertura, ocho partes). Hasta F6 la carta se escribía fuera de la plataforma, copiando cifras a mano. El modelo de datos preveía `client_documents` con un texto en Markdown y marcadores del estilo `{{cifra:summary.annualSurplus}}`, y `plan_deliveries.documents` vacío hasta F7. P-A13 pide un editor por secciones con "Insertar cifra" y "Ver como el cliente".

## Decisión

- **Por secciones.** `client_documents.content` es un objeto con el texto de cada parte de la carta (`LETTER_SECTIONS`, en el orden del protocolo); las notas tienen una sola parte (`body`). Hay una carta y unas notas por cliente.
- **Marcadores en español.** Una cifra se escribe como `{{sobrante_anual}}`: el asesor los ve al escribir, así que van en español (`FIGURE_MARKERS`, uno por cada cifra clave del motor). "Insertar cifra" los pone donde quedó el cursor. Guardar rechaza un marcador que no es de ninguna cifra; al mostrar, uno desconocido o una cifra sin valor se leen "—", nunca la llave.
- **Formato mínimo.** Párrafos separados por una línea vacía y viñetas con "- ". No hay HTML ni Markdown completo: la pantalla y el futuro PDF lo muestran igual y sin riesgo de inyección.
- **En vivo y congeladas.** Mientras son borrador, y en las notas publicadas, las cifras se calculan con los datos de hoy. Al entregar el plan, la carta y las notas publicadas se guardan en `plan_deliveries.documents` con los títulos en el trato del cliente y las cifras ya escritas: no cambian aunque cambien los datos, y entran al sha256 de la entrega.
- **Quién ve qué.** Solo el asesor escribe. El cliente lee las notas cuando el asesor las publica (RLS) y la carta solo dentro del plan entregado; la carta no se publica sola. Las notas en borrador no van con la entrega.
- **Dónde vive.** Las secciones, los marcadores y el formato están en `packages/exporters` (`@miluca/exporters/documents`), que también generará el PDF. No consultan la base ni calculan cifras: reciben los valores ya escritos con el formato del país.

## Consecuencias

- No cambia ningún resultado del motor.
- Una carta nueva trae escrito el alcance (parte 7), con la remisión a contador, entidad de pensiones y abogado (regla 11).
- Las entregas anteriores a este cambio no tienen documentos y se muestran como antes.
- Falta el PDF de la carta (P-A14), que leerá los mismos `documents` de la entrega.

## Alternativas consideradas

- **Un solo texto en Markdown con encabezados.** Más libre, pero depende de que el asesor respete los títulos y obliga a interpretar Markdown en la pantalla y en el PDF.
- **Marcadores con la llave del motor (`{{cifra:annualSurplus}}`).** Estables, pero el asesor vería identificadores en inglés en un texto en español.
- **Guardar la carta con las cifras escritas desde el principio.** Más simple, pero las cifras quedarían viejas en cuanto cambie un dato antes de entregar.
