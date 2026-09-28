# packages/ui

Sistema de diseño: tokens (color, tipografía, espacios, radios), componentes base accesibles (botón, campo de dinero con selector de moneda, selector, hoja inferior, tabla responsiva, indicador de semáforo) y patrones de uso con una mano.

## Responsabilidad

Componentes genéricos sin conocimiento del dominio financiero ni de Supabase. Un componente que sabe qué es un bolsillo va en `apps/web/src/features/pockets`, no aquí.

Los tokens salen de la paleta elegida (opción 3). Ver `docs/diseno/tokens.md`.
