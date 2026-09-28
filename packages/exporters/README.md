# packages/exporters

Generación de entregables a partir de los resultados del motor:

- Excel compatible con `Plantilla_Asesoria_Financiera.xlsx` (mismas hojas y celdas de entrada).
- Carta de cierre en PDF (estructura de la sección 11 del protocolo).
- Ficha de continuidad (Anexo C del protocolo) en texto y PDF.

## Responsabilidad

Convertir un `CaseResult` y los textos del asesor en archivos. No consulta la base de datos ni calcula cifras: recibe todo listo, para que las cifras de la carta sean idénticas a las del plan.
