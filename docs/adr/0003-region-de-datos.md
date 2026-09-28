# 0003. Región de datos: Supabase en us-east-2 (Ohio)

- Estado: Aceptada (reemplaza la propuesta inicial de una región de la Unión Europea)
- Fecha: 2026-09-28

## Contexto

Clientes en Colombia y España. La propuesta inicial era una región de la UE (Irlanda) para simplificar el RGPD. El asesor ya creó el proyecto de Supabase, y su dirección de base de datos pertenece al rango de AWS de **us-east-2 (Ohio)** según la lista pública de rangos de AWS [F32]. La región no se puede cambiar después sin migrar a un proyecto nuevo (**Supuesto**, F13 no lo aclara).

## Decisión

Producción en el proyecto ya creado, en us-east-2. Las funciones de Vercel se configuran en `cle1` (Cleveland), que corresponde a us-east-2 [F33]; por defecto Vercel usa `iad1`, así que hay que cambiarlo.

## Consecuencias

- Menor latencia para Colombia, que es donde está la mayoría de clientes.
- Colombia: la SIC declaró a Estados Unidos país con nivel adecuado de protección (Circular Externa 5 de 2017) [F21].
- España: los datos de clientes residentes en la UE salen del Espacio Económico Europeo. Hay que apoyarse en el DPA de Supabase, que incluye su evaluación de impacto de transferencias [F23], y confirmar con el abogado la base de la transferencia.
- Si el abogado desaconseja la región para clientes de España, la alternativa es crear otro proyecto en la UE antes de cargar datos reales, y usar este como staging.

## Alternativas consideradas

- eu-west-1 (Irlanda): menos fricción con el RGPD, más latencia para Colombia.
- sa-east-1 (São Paulo): cercana a Colombia; transferencias bajo el RGPD por evaluar.
