# Guía para agentes de código

Este archivo lo leen Claude Code y otros agentes antes de trabajar en el repositorio.

## Contexto

MiLuca es una plataforma de planificación financiera personal para un asesor y sus clientes (Colombia y España). La metodología está en `referencia/Protocolo_Asesoria_Financiera.md` y los cálculos en `referencia/Plantilla_Asesoria_Financiera.xlsx`. Lee `docs/README.md` antes de proponer cambios de alcance.

## Reglas

1. **Idioma.** Textos del producto y documentación en español, sin emojis. Identificadores de código en inglés según `docs/glosario.md`. Si falta un término, agrégalo al glosario en el mismo cambio.
2. **No inventar.** Si algo es ambiguo, anótalo en `docs/07-preguntas-abiertas.md`, usa un supuesto marcado como tal y sigue.
3. **Fuentes.** Todo dato externo (precios, límites, normativa, parámetros de país) se registra en `docs/fuentes.md` con URL y fecha de consulta.
4. **Datos de clientes.** Nunca copies datos de `referencia/casos/` a código, pruebas, documentación ni mensajes de commit. Las pruebas usan solo casos anonimizados.
5. **Motor de cálculo puro.** `packages/engine` no importa nada de React, Next.js, Supabase ni del sistema de archivos. Recibe la fecha de corte como dato; nunca usa la fecha del sistema.
6. **Fórmulas.** Cualquier cambio que altere un resultado del motor necesita un ADR en `docs/adr/` y la actualización de las pruebas de oro, con la explicación de la diferencia frente a la plantilla.
7. **Números.** El motor calcula con `number` (doble precisión, igual que Excel) y solo redondea al presentar. No uses librerías decimales en el motor sin un ADR.
8. **Seguridad.** Toda tabla nueva lleva RLS activado y sus políticas en la misma migración, con pruebas en `supabase/tests/`. La clave `service_role` nunca llega al navegador.
9. **Privacidad.** No se guardan números de cuenta, tarjeta, documento ni contraseñas del cliente. Los bancos se identifican solo por su nombre.
10. **Multimoneda.** Nunca asumas una moneda fija. Todo importe es `Money { amount, currency }`; la conversión a la moneda base usa las tasas del cliente (`client_fx_rates`) y solo ocurre en el motor.
11. **Límites profesionales.** La interfaz no recomienda productos ni entidades, marca toda proyección como ilustrativa y remite impuestos, pensión y temas legales al profesional correspondiente.

## Dependencias entre paquetes

`apps/web` puede usar todos los paquetes. `packages/exporters` usa `engine`, `domain` e `i18n`. `packages/engine` solo usa `domain`. `packages/domain` no depende de ningún otro paquete del repositorio. Detalle en `docs/08-estructura-del-repositorio.md`.
