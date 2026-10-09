import { expect, test } from '@playwright/test';

test('la página de inicio carga en español con el nombre del producto', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  // Sin sesión, la raíz es el landing (ADR 0026): la marca va en la cabecera, sin traducir.
  await expect(page.getByRole('banner').getByText('MiLuca', { exact: true })).toHaveAttribute(
    'translate',
    'no',
  );
});

test('declara lo necesario para instalarse como app', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  // La app instalada abre en Entrar, nunca en el landing de la raíz (ADR 0026).
  expect(manifest.start_url).toBe('/entrar');
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
    true,
  );
});
