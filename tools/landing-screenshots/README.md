# Capturas del landing

Genera las imágenes del landing (ADR 0026) con un caso inventado, nunca con datos de clientes (regla 4 de `CLAUDE.md`):

| Archivo | Qué muestra |
|---|---|
| `apps/web/public/landing/budget-{es,en}.png` | Mi plan, reporte de presupuesto: cifras del plan, fondo de emergencia y bolsillos |
| `apps/web/public/landing/debts-{es,en}.png` | Mi plan, reporte de deudas: el plan de pago |
| `apps/web/public/landing/my-data-{es,en}.png` | Mis datos |
| `apps/web/src/app/opengraph-image.png` y `.alt.txt` | La vista previa del enlace al compartirlo (1200 x 630) |

Cada captura es un teléfono de 390 x 844 px a doble densidad (780 x 1688 px, `SCREENSHOT_SIZE` en `features/landing/screenshots.ts`); `next/image` las sirve en WebP al ancho de cada pantalla.

## Cómo se usa

Con Supabase local arrancado y las migraciones al día:

```sh
pnpm supabase start
pnpm --filter @miluca/landing-screenshots capture
```

La herramienta:

1. Lee la conexión con `pnpm exec supabase status` y **se niega a seguir si no es local**: crea y borra datos.
2. Para cada idioma, borra el caso de la corrida anterior y lo vuelve a armar como lo haría el asesor (con su sesión y RLS): ingresos, gastos, tres bolsillos, dos deudas y la prueba de realidad, con los nombres en ese idioma (`fictitious-case.ts`). Las cuentas son `asesoria.capturas@example.com` y `cliente.capturas@example.com`, con una contraseña nueva en cada corrida.
3. Arranca la app en modo desarrollo en el puerto 3200 contra Supabase local, sin el número de WhatsApp ni la clave de Anthropic.
4. Entra como asesor y entrega los reportes de presupuesto y de deudas (P-A14); entra como cliente y fotografía las tres pantallas.
5. Al final, arma la imagen para compartir con el título del landing en español.

Con `--url http://localhost:3000` usa una app que ya esté corriendo; tiene que apuntar a Supabase local, o el inicio de sesión fallará porque las cuentas solo existen ahí.

Se vuelve a correr cuando cambien esas pantallas, el caso o el título del landing, y se revisan las imágenes antes de subirlas. Solo reemplaza las capturas (`<pantalla>-<idioma>.webp`): el resto de `public/landing/`, como la foto del asesor (`advisor.webp`), no lo toca.
