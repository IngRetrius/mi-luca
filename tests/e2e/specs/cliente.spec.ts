import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del cliente exigen sesión y vuelven a la ruta pedida. P-C03
// (iPhone y Android) y P-C11 (retirar y devolver el acceso, consentimientos) se verificaron contra
// Supabase local (ver apps/web/README.md), igual que en F2 Mis datos y la edición de un gasto con
// "Así cambia tu plan" (P-C06 y P-C07).

for (const path of [
  '/instalar',
  '/privacidad-y-datos',
  '/mis-datos',
  '/mis-datos/gastos',
  '/mis-datos/gastos/nuevo',
  '/mis-datos/gastos/00000000-0000-4000-8000-000000000001',
]) {
  test(`${path} sin sesión lleva a Entrar con la ruta de retorno`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
  });
}
