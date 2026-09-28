# 0004. Motor de cálculo puro en TypeScript, con doble precisión

- Estado: Propuesta
- Fecha: 2026-09-28

## Contexto

El motor debe reproducir la plantilla de Excel con diferencias de 0,01 como máximo, correr en el navegador (vista previa al editar) y en el servidor (cifras oficiales, planes entregados, exportaciones), y ser testeable sin interfaz ni base de datos.

## Decisión

Un paquete `packages/engine` en TypeScript, sin dependencias de React, Next.js, Supabase ni del sistema. Calcula con `number` (IEEE 754 de doble precisión, la misma aritmética de Excel) y redondea solo al presentar. La fecha de corte es un dato de entrada.

## Consecuencias

- Mismos resultados en navegador y servidor.
- Los resultados coinciden con Excel también en los decimales intermedios.
- No se usa una librería decimal: si algún cálculo lo necesitara, requiere un ADR nuevo.

## Alternativas consideradas

- Cálculo en SQL (funciones de Postgres): no corre en el navegador y es más difícil de probar contra Excel.
- Librería decimal: más exacta en términos contables, pero se aleja de los valores de la plantilla.
