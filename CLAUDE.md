# Guía para agentes de código

Este archivo lo leen Claude Code y otros agentes antes de trabajar en el repositorio.

## Contexto

MiLuca es una plataforma de planificación financiera personal para un asesor y sus clientes (Colombia y España). La metodología está en `referencia/Protocolo_Asesoria_Financiera.md` y los cálculos en `referencia/Plantilla_Asesoria_Financiera.xlsx`. Lee `docs/README.md` antes de proponer cambios de alcance.

Cada caso es diferente. El país del cliente solo fija la moneda base, el formato, los parámetros y qué reglas existen. Nada del caso se deduce del país ni de los casos de prueba: quién paga cada gasto o el tipo de cliente se marcan cliente por cliente. Los umbrales fiscales no se usan en la app (decisión del 09/10/2026 en `docs/07-preguntas-abiertas.md`). La pensión no se analiza en la plataforma (ADR 0016).

## Reglas

1. **Idioma.** Documentación en español y textos del producto en español e inglés (`packages/i18n/messages/es.json` y `en.json`, con las mismas claves; ADR 0022), sin emojis. Identificadores de código en inglés según `docs/glosario.md`. Si falta un término, agrégalo al glosario en el mismo cambio.
2. **No inventar.** Si algo es ambiguo, anótalo en `docs/07-preguntas-abiertas.md`, usa un supuesto marcado como tal y sigue.
3. **Fuentes.** Todo dato externo (precios, límites, normativa, parámetros de país) se registra en `docs/fuentes.md` con URL y fecha de consulta.
4. **Datos de clientes.** Nunca copies datos de `referencia/casos/` a código, pruebas, documentación ni mensajes de commit. Las pruebas usan solo casos anonimizados.
5. **Motor de cálculo puro.** `packages/engine` no importa nada de React, Next.js, Supabase ni del sistema de archivos. Recibe la fecha de corte como dato; nunca usa la fecha del sistema.
6. **Fórmulas.** Cualquier cambio que altere un resultado del motor necesita un ADR en `docs/adr/` y la actualización de las pruebas de oro, con la explicación de la diferencia frente a la plantilla.
7. **Números.** El motor calcula con `number` (doble precisión, igual que Excel) y solo redondea al presentar. No uses librerías decimales en el motor sin un ADR.
8. **Seguridad.** Toda tabla nueva lleva RLS activado y sus políticas en la misma migración, con pruebas en `supabase/tests/`. La clave secreta de Supabase (`SUPABASE_SECRET_KEY`, antes `service_role`) solo se usa en módulos con `import 'server-only'` y nunca llega al navegador.
9. **Privacidad.** No se guardan números de cuenta, tarjeta, documento ni contraseñas del cliente. La única excepción son los extractos que el cliente sube para la videollamada: temporales, solo los ven él y su asesor, nunca van a Claude ni al plan, y se borran al revisarlos o a los 30 días, siempre con la API de Storage (ADR 0030). Los bancos se identifican solo por su nombre. La contraseña de acceso a MiLuca la maneja solo Supabase Auth (guarda un hash); nunca va a tablas propias ni a registros (ADR 0009).
10. **Multimoneda.** Nunca asumas una moneda fija. Todo importe es `Money { amount, currency }`; la conversión a la moneda base usa las tasas del cliente (`client_fx_rates`) y solo ocurre en el motor.
11. **Límites profesionales.** La interfaz no recomienda productos ni entidades, marca toda proyección como ilustrativa y remite impuestos, pensión y temas legales al profesional correspondiente.
12. **Frontend.** Todo trabajo de interfaz invoca las skills de `.claude/skills/` antes de editar y revisa cada pantalla nueva o cambiada con `web-design-guidelines` antes de darla por terminada. El detalle está en `.claude/rules/frontend.md`, que se carga solo al abrir archivos de interfaz. Estas reglas del repositorio mandan sobre las skills. Los controles usan las clases de `apps/web/src/components/ui-classes.ts`, y los componentes de cliente reciben sus textos por props desde el servidor. El lint exige como error las reglas recomendadas de accesibilidad (`jsx-a11y`).

## Comandos

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e` deben pasar antes de dar un cambio por terminado. En `apps/web`, lee la guía de Next.js que trae el paquete (`apps/web/AGENTS.md`) antes de escribir código de Next.

## Dependencias entre paquetes

`apps/web` puede usar todos los paquetes. `packages/exporters` usa `engine`, `domain` e `i18n`. `packages/engine` solo usa `domain`. `packages/domain` no depende de ningún otro paquete del repositorio. Detalle en `docs/08-estructura-del-repositorio.md`.
