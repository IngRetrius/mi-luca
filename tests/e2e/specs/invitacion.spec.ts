import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del flujo de invitación explican por qué no se puede seguir. El
// flujo completo (enlace del asesor, P-C01, P-C02, P-C12 con contraseña, aceptación, enlace anulado
// y enlace usado) se verificó contra Supabase local (ver apps/web/README.md).

const WELL_FORMED_TOKEN = 'A'.repeat(43);

test('un enlace con un token mal formado no se busca', async ({ page }) => {
  await page.goto('/invitacion/no-es-un-token');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Este enlace de invitación no sirve' }),
  ).toBeVisible();
});

test('la invitación no deja el token en el Referer ni en buscadores', async ({ page }) => {
  await page.goto(`/invitacion/${WELL_FORMED_TOKEN}`);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('sin servicio, la invitación ofrece reintentar en la misma ruta', async ({ page }) => {
  await page.goto(`/invitacion/${WELL_FORMED_TOKEN}`);
  await expect(page.getByRole('heading', { level: 1, name: 'No pudimos continuar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Intentar de nuevo' })).toHaveAttribute(
    'href',
    `/invitacion/${WELL_FORMED_TOKEN}`,
  );
});

for (const path of ['/invitacion/consentimiento', '/invitacion/acceso']) {
  test(`${path} sin abrir antes el enlace pide abrirlo de nuevo`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Abre de nuevo el enlace de la invitación' }),
    ).toBeVisible();
  });
}

test('aceptar sin el flujo en curso lleva a la explicación', async ({ page }) => {
  await page.goto('/invitacion/aceptar');
  await expect(page).toHaveURL('/invitacion/problema?motivo=missing');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Abre de nuevo el enlace de la invitación' }),
  ).toBeVisible();
});

test('una invitación usada lleva a Entrar', async ({ page }) => {
  await page.goto('/invitacion/problema?motivo=used');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta invitación ya se aceptó' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
});

test('un motivo desconocido se trata como enlace que no sirve', async ({ page }) => {
  await page.goto('/invitacion/problema?motivo=<script>');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Este enlace de invitación no sirve' }),
  ).toBeVisible();
});

test('las pantallas de la invitación no desbordan a 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/invitacion/problema?motivo=linked');
  const [scrollWidth, innerWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});
