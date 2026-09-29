import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del asesor y P-G02 exigen sesión y vuelven a la ruta pedida.
// El flujo con sesión (lista vacía, crear perfil, ficha, P-G02) se verificó contra Supabase local.

for (const path of ['/clientes', '/clientes/nuevo', '/sin-invitacion']) {
  test(`${path} sin sesión lleva a Entrar con la ruta de retorno`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
    await expect(page.getByRole('link', { name: 'Continuar con Google' })).toHaveAttribute(
      'href',
      `/auth/start?provider=google&next=${encodeURIComponent(path)}`,
    );
  });
}

test('una ruta que no existe muestra la página en español', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe');
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'No encontramos esta página' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
});
