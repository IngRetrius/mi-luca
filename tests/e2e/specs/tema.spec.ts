import { expect, test, type Page } from '@playwright/test';

// Tema claro u oscuro (ADR 0033): sin elección, el del equipo; con elección, una cookie en el equipo
// que el servidor lee para mandar la página ya con su tema, sin destello. No necesita Supabase:
// Entrar se muestra sin sesión.

const LIGHT_BG = 'rgb(255, 255, 255)'; // #FFFFFF
const DARK_BG = 'rgb(17, 20, 43)'; // #11142B

function background(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

function colorScheme(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
}

const option = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('sin elegir, sigue al equipo en modo claro', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(page.getByRole('group', { name: 'Tema' })).toBeVisible();
  await expect(option(page, 'Automático')).toHaveAttribute('aria-pressed', 'true');
  expect(await background(page)).toBe(LIGHT_BG);
  // Una barra del navegador para cada modo del equipo.
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
});

test('elegir Oscuro cambia al momento, se recuerda y vuelve a automático', async ({ page }) => {
  await page.goto('/entrar');
  await option(page, 'Oscuro').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(option(page, 'Oscuro')).toHaveAttribute('aria-pressed', 'true');
  await expect(option(page, 'Automático')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => background(page)).toBe(DARK_BG);
  expect(await colorScheme(page)).toBe('dark');

  // El servidor ya manda el HTML con el tema: no hay destello del claro al cargar.
  const html = await (await page.request.get('/recuperar')).text();
  expect(html).toMatch(/<html[^>]* data-theme="dark"/);

  await page.goto('/recuperar');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await background(page)).toBe(DARK_BG);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#11142B');

  await page.goto('/entrar');
  await option(page, 'Automático').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(option(page, 'Automático')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => background(page)).toBe(LIGHT_BG);
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
});

test.describe('con el equipo en modo oscuro', () => {
  test.use({ colorScheme: 'dark' });

  test('sin elegir, la app sale oscura', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    expect(await background(page)).toBe(DARK_BG);
    expect(await colorScheme(page)).toBe('light dark');
  });

  test('elegir Claro manda sobre el equipo, también en los controles', async ({ page }) => {
    await page.goto('/entrar');
    await option(page, 'Claro').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => background(page)).toBe(LIGHT_BG);
    expect(await colorScheme(page)).toBe('light');

    await page.goto('/recuperar');
    expect(await background(page)).toBe(LIGHT_BG);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#FFFFFF');

    await page.goto('/entrar');
    await option(page, 'Automático').click();
    await expect.poll(() => background(page)).toBe(DARK_BG);
  });
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('el selector funciona igual: lo guarda el servidor', async ({ page }) => {
    await page.goto('/entrar');
    await option(page, 'Oscuro').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(option(page, 'Oscuro')).toHaveAttribute('aria-pressed', 'true');
    expect(await background(page)).toBe(DARK_BG);
  });
});
