import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del cliente exigen sesión y vuelven a la ruta pedida. P-C03
// (iPhone y Android) y P-C11 (retirar y devolver el acceso, consentimientos) se verificaron contra
// Supabase local (ver apps/web/README.md), igual que en F2 Mis datos con sus gastos, ingresos y
// monedas, y la edición con "Así cambia tu plan" (P-C06 y P-C07). En F3, el inicio con el plan
// entregado y Mi plan (P-C05) con la comparación con hoy. Después de F3, la lista de gastos típicos
// del país (P-A06b en Mis gastos).

for (const path of [
  '/instalar',
  '/privacidad-y-datos',
  '/mis-datos',
  '/mis-datos/gastos',
  '/mis-datos/gastos/nuevo',
  '/mis-datos/gastos/lista',
  '/mis-datos/gastos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/ingresos',
  '/mis-datos/ingresos/nuevo',
  '/mis-datos/ingresos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/ingresos/seguridad-social',
  '/mis-datos/ingresos/ingreso-base',
  '/mis-datos/monedas',
  '/mis-datos/monedas/nueva',
  '/mis-datos/monedas/USD',
  '/mi-plan',
  '/mis-datos/bolsillos',
  '/mis-datos/bolsillos/nuevo',
  '/mis-datos/bolsillos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/bolsillos/fondo',
  '/mis-datos/bolsillos/meses-sin-ingreso',
  '/mis-datos/bolsillos/bancos',
  '/mis-datos/bolsillos/bancos/nuevo',
  '/mis-datos/cobros',
  '/mis-datos/cobros/nuevo',
  '/mis-datos/patrimonio',
  '/mis-datos/patrimonio/nuevo',
  '/mis-datos/prueba-de-realidad',
]) {
  test(`${path} sin sesión lleva a Entrar con la ruta de retorno`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
  });
}
