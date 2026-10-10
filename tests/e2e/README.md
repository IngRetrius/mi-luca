# tests/e2e

Pruebas de extremo a extremo (Playwright) de los flujos críticos, en viewport de celular (iPhone y Android). El diseño adaptable, el idioma y el landing (`adaptable.spec.ts`, `idioma.spec.ts`, `landing.spec.ts`) corren además en tableta y escritorio (ADR 0022, 0023 y 0026). El tema claro u oscuro (`tema.spec.ts`, ADR 0033) se prueba con el equipo en claro y en oscuro, y sin JavaScript. La app de prueba corre con un número de WhatsApp inventado (`contact-env.ts`), que manda sobre el de `apps/web/.env.local`:

- Asesor: crear cliente, invitarlo, capturar datos por fases, entregar un plan.
- Cliente: aceptar invitación, dar consentimiento, ver su plan, editar un gasto, registrar el control mensual, retirar el acceso al asesor.
- Permisos: un cliente no ve datos de otro; un asesor sin acceso no ve al cliente.
