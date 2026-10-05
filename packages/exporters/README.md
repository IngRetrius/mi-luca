# packages/exporters

Generación de entregables a partir de los resultados del motor:

- Excel compatible con `Plantilla_Asesoria_Financiera.xlsx` (mismas hojas y celdas de entrada).
- Carta de cierre en PDF (estructura de la sección 11 del protocolo).
- Ficha de continuidad (Anexo C del protocolo) en texto y PDF.

## Responsabilidad

Convertir un `CaseResult` y los textos del asesor en archivos. No consulta la base de datos ni calcula cifras: recibe todo listo, para que las cifras de la carta sean idénticas a las del plan.

## Documentos (`@miluca/exporters/documents`)

La carta de cierre y las notas para el cliente (ADR 0019): las partes de la carta en el orden de la sección 11 del protocolo (`LETTER_SECTIONS`), los marcadores de cifras en español (`FIGURE_MARKERS`, `fillFigures`, `unknownMarkers`) y el formato que admiten (`textBlocks`: párrafos y viñetas). Es código puro y sin textos de la interfaz, así que lo usan la pantalla, el navegador (vista previa) y el futuro PDF.

## PDF (`@miluca/exporters/pdf`)

`renderLetterPdf` arma el PDF del plan entregado con `@react-pdf/renderer`: la carta, las notas y las cifras, ya escritas en el trato y el formato del cliente, con los colores del modo claro de `packages/ui`. Lo usa la app al descargar (ADR 0020). Se importa aparte de `documents`, para que la librería de PDF no llegue a las pantallas.
