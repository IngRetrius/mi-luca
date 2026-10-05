import { expect, test } from '@playwright/test';

// Idioma de la interfaz (ADR 0022): sin elección, el del navegador; con elección, una cookie en el
// equipo. No necesita Supabase: Entrar se muestra sin sesión.

test('con el navegador en español, la app sale en español', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page).toHaveTitle('Entrar | MiLuca');
  await expect(page.getByText('Entra a tu planificación financiera.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('el selector cambia a inglés, lo recuerda al volver y vuelve a español', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Sign in to your financial plan.')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/recuperar');
  await expect(page).toHaveTitle('Reset password | MiLuca');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset password');

  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('Entra a tu planificación financiera.')).toBeVisible();
});

test.describe('con el navegador en inglés', () => {
  test.use({ locale: 'en-US' });

  test('sin elegir, la app sale en inglés', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('Sign in | MiLuca');
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByText('Access is by invitation from your advisor.')).toBeVisible();
  });

  test('una página que no existe también sale en inglés', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We could not find this page');
  });
});
