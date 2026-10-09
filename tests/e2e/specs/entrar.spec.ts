import { expect, test } from '@playwright/test';

// Estas pruebas no necesitan Supabase: CI corre sin claves. El inicio de sesión con contraseña y el
// aviso entre ventanas se verificaron contra Supabase local (ver apps/web/README.md).

test('Entrar muestra Google, el correo y la contraseña', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('link', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByLabel('Correo', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
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

test('sin datos, marca los campos, anuncia el error y lleva el foco al correo', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const email = page.getByLabel('Correo', { exact: true });
  await expect(page.getByText('Escribe tu correo y tu contraseña.')).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(email).toBeFocused();
  await expect(email).toHaveAccessibleDescription('Escribe tu correo y tu contraseña.');
});

test('con el correo escrito, el foco va a la contraseña que falta', async ({ page }) => {
  await page.goto('/entrar');
  const email = page.getByLabel('Correo', { exact: true });
  await email.fill('persona@example.com');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeFocused();
  await expect(email).toHaveValue('persona@example.com');
  await expect(email).toHaveAttribute('aria-invalid', 'false');
});

test('la contraseña se puede mostrar y ocultar', async ({ page }) => {
  await page.goto('/entrar');
  const password = page.getByLabel('Contraseña', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('a 320 px de ancho nada se sale de la pantalla', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/entrar');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  const toggle = await page.getByRole('button', { name: 'Mostrar contraseña' }).boundingBox();
  expect(toggle && toggle.x + toggle.width).toBeLessThanOrEqual(320);
});

test('el nombre de la marca no se traduce', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'MiLuca' })).toHaveAttribute(
    'translate',
    'no',
  );
});

test('"Olvidé mi contraseña" abre la recuperación en la misma app', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Olvidé mi contraseña' }).click();
  await expect(page).toHaveURL('/recuperar');
  await expect(page.getByRole('heading', { level: 1, name: 'Recuperar contraseña' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 3')).toBeVisible();
  await expect(page.getByLabel('Correo')).toHaveAttribute('autocomplete', 'username');
  await expect(page.getByRole('link', { name: 'Volver a Entrar' })).toHaveAttribute(
    'href',
    '/entrar',
  );
});
