import { expect, test } from '@playwright/test';

// Estas pruebas no necesitan Supabase: CI corre sin claves. El inicio de sesión con contraseña y el
// aviso entre ventanas se verificaron contra Supabase local (ver apps/web/README.md).

test('sin sesión, el inicio lleva a Entrar', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('link', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByLabel('Correo')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await expect(page.getByText('El acceso es por invitación de tu asesor.')).toBeVisible();
});

test('Google empieza en /auth/start con la ruta de retorno', async ({ page }) => {
  await page.goto('/entrar?next=%2Fplan');
  await expect(page.getByRole('link', { name: 'Continuar con Google' })).toHaveAttribute(
    'href',
    '/auth/start?provider=google&next=%2Fplan',
  );
});

test('una ruta de retorno externa se descarta', async ({ page }) => {
  await page.goto(`/entrar?next=${encodeURIComponent('https://sitio-malo.example/robar')}`);
  await expect(page.getByRole('link', { name: 'Continuar con Google' })).toHaveAttribute(
    'href',
    '/auth/start?provider=google&next=%2F',
  );
});

test('pide correo y contraseña antes de consultar el acceso', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Escribe tu correo y tu contraseña.')).toBeVisible();
});

test('la contraseña se puede mostrar y ocultar', async ({ page }) => {
  await page.goto('/entrar');
  const password = page.getByLabel('Contraseña');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});
