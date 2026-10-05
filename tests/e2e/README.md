# tests/e2e

Pruebas de extremo a extremo (Playwright) de los flujos críticos, en viewport de celular (iPhone y Android). El diseño adaptable y el idioma (`adaptable.spec.ts`, `idioma.spec.ts`) corren además en tableta y escritorio (ADR 0022 y 0023):

- Asesor: crear cliente, invitarlo, capturar datos por fases, entregar un plan.
- Cliente: aceptar invitación, dar consentimiento, ver su plan, editar un gasto, registrar el control mensual, retirar el acceso al asesor.
- Permisos: un cliente no ve datos de otro; un asesor sin acceso no ve al cliente.
