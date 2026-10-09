import { expect, test, type Page } from '@playwright/test';

// Diseño adaptable (ADR 0023): del celular de 320 px al escritorio de 1440 px, ninguna pantalla se
// desplaza de lado y los controles principales se ven enteros. Corre en los proyectos de celular,
// tableta y escritorio (playwright.config.ts). Sin Supabase: las pantallas públicas.

const WIDTHS = [320, 768, 1024, 1440] as const;
const PUBLIC_PATHS = ['/', '/privacidad', '/entrar', '/recuperar', '/no-existe'] as const;

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const path of PUBLIC_PATHS) {
  test(`${path} no se desplaza de lado en ningún ancho`, async ({ page }) => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      expect(await horizontalOverflow(page), `${path} a ${width} px`).toBe(0);
    }
  });
}

test('en Entrar, el formulario y el selector de idioma caben en la pantalla', async ({ page }) => {
  await page.goto('/entrar');
  const viewport = page.viewportSize();
  for (const control of [
    page.getByRole('button', { name: 'Entrar', exact: true }),
    page.getByRole('button', { name: 'English' }),
  ]) {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    // Objetivo táctil de al menos 44 px de alto.
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
