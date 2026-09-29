import { expect, test } from '@playwright/test';

// La tipografía (Livvic) la aloja la app con next/font: se usa de verdad y ningún archivo de fuente
// se pide a otro dominio (docs/diseno/tokens.md, sección 4).
test('la tipografía es Livvic y se sirve desde el mismo dominio', async ({ page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });

  await page.goto('/entrar');
  await page.evaluate(() => document.fonts.ready);

  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFont).toMatch(/^"?Livvic"?,/);
  const loaded = await page.evaluate(() =>
    [...document.fonts].some((face) => face.family.includes('Livvic') && face.status === 'loaded'),
  );
  expect(loaded).toBe(true);

  const origin = new URL(page.url()).origin;
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
});
