import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del asesor y P-G02 exigen sesión y vuelven a la ruta pedida.
// El flujo con sesión (lista vacía, crear perfil, ficha, P-G02; en F2, presupuesto con filtros,
// alta y edición con vista previa, ingresos, seguridad social, ingreso base, monedas, perfil y
// supuestos, costo de vida, cifras de la ficha y aviso con el antes y después) se verificó contra
// Supabase local.

const CLIENT = '00000000-0000-4000-8000-000000000001';

for (const path of [
  '/clientes',
  '/clientes/nuevo',
  '/sin-invitacion',
  `/clientes/${CLIENT}/presupuesto`,
  `/clientes/${CLIENT}/presupuesto/nuevo`,
  `/clientes/${CLIENT}/presupuesto/${CLIENT}`,
  `/clientes/${CLIENT}/ingresos`,
  `/clientes/${CLIENT}/ingresos/nuevo`,
  `/clientes/${CLIENT}/ingresos/${CLIENT}`,
  `/clientes/${CLIENT}/ingresos/seguridad-social`,
  `/clientes/${CLIENT}/ingresos/ingreso-base`,
  `/clientes/${CLIENT}/monedas`,
  `/clientes/${CLIENT}/monedas/nueva`,
  `/clientes/${CLIENT}/monedas/USD`,
  `/clientes/${CLIENT}/perfil`,
  `/clientes/${CLIENT}/costo-de-vida`,
]) {
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
