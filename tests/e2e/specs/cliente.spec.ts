import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del cliente exigen sesión y vuelven a la ruta pedida. P-C03
// (iPhone y Android) y P-C11 (retirar y devolver el acceso, consentimientos) se verificaron contra
// Supabase local (ver apps/web/README.md).

for (const path of ['/instalar', '/privacidad-y-datos']) {
  test(`${path} sin sesión lleva a Entrar con la ruta de retorno`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
  });
}
