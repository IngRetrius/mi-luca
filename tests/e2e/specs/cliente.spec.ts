import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del cliente exigen sesión y vuelven a la ruta pedida. P-C03
// (iPhone y Android) y P-C11 (retirar y devolver el acceso, consentimientos) se verificaron contra
// Supabase local (ver apps/web/README.md), igual que en F2 Mis datos con sus gastos, ingresos y
// monedas, y la edición con "Así cambia tu plan" (P-C06 y P-C07). En F3, el inicio con el plan
// entregado y Mi plan (P-C05) con la comparación con hoy. Después de F3, la lista de gastos típicos
// del país (P-A06b en Mis gastos). En F4, las deudas del cliente con su plan de pago y P-C10 (marcar cuotas pagadas). En F5,
// inversión con el perfil de riesgo, metas con la calculadora de viaje y seguros. En F7, el control
// mensual (P-C08), las tareas (P-C09), las próximas tareas del inicio, y en Mi plan las notas
// publicadas y la carta por secciones. Los documentos del cliente (P-C13, ADR 0030): aceptar la
// invitación, subir un PDF y una imagen, el rechazo de otro formato, "Ver" con su enlace firmado,
// "Continuar" y el inicio.

const FILE = '00000000-0000-4000-8000-000000000001';

for (const path of [
  '/instalar',
  '/privacidad-y-datos',
  '/mis-datos',
  '/mis-datos/gastos',
  '/mis-datos/gastos/nuevo',
  '/mis-datos/gastos/lista',
  '/mis-datos/gastos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/ingresos',
  '/mis-datos/ingresos/nuevo',
  '/mis-datos/ingresos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/ingresos/seguridad-social',
  '/mis-datos/ingresos/ingreso-base',
  '/mis-datos/monedas',
  '/mis-datos/monedas/nueva',
  '/mis-datos/monedas/USD',
  '/mi-plan',
  '/mis-datos/bolsillos',
  '/mis-datos/bolsillos/nuevo',
  '/mis-datos/bolsillos/00000000-0000-4000-8000-000000000001',
  '/mis-datos/bolsillos/fondo',
  '/mis-datos/bolsillos/meses-sin-ingreso',
  '/mis-datos/bolsillos/bancos',
  '/mis-datos/bolsillos/bancos/nuevo',
  '/mis-datos/deudas',
  '/mis-datos/deudas/nuevo',
  '/mis-datos/deudas/panel',
  '/mis-datos/deudas/00000000-0000-4000-8000-000000000001',
  '/mis-datos/deudas/00000000-0000-4000-8000-000000000001/cuotas',
  '/mis-datos/deudas/00000000-0000-4000-8000-000000000001/cuotas/1',
  '/mis-datos/cobros',
  '/mis-datos/cobros/nuevo',
  '/mis-datos/patrimonio',
  '/mis-datos/patrimonio/nuevo',
  '/mis-datos/prueba-de-realidad',
  '/mis-datos/inversion',
  '/mis-datos/inversion/nueva',
  '/mis-datos/inversion/perfil',
  '/mis-datos/inversion/00000000-0000-4000-8000-000000000001',
  '/mis-datos/metas',
  '/mis-datos/metas/nueva',
  '/mis-datos/metas/00000000-0000-4000-8000-000000000001',
  '/mis-datos/seguros',
  '/mis-datos/seguros/nuevo',
  '/mis-datos/seguros/00000000-0000-4000-8000-000000000001',
  '/control-mensual',
  '/documentos',
  '/tareas',
  '/tareas/00000000-0000-4000-8000-000000000001',
]) {
  test(`${path} sin sesión lleva a Entrar con la ruta de retorno`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
  });
}

test('el PDF del plan sin sesión lleva a Entrar y vuelve a Mi plan', async ({ page }) => {
  await page.goto('/mi-plan/pdf');
  await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent('/mi-plan')}`);
});

test('ver un documento sin sesión lleva a Entrar y vuelve a Tus documentos', async ({ page }) => {
  await page.goto(`/documentos/${FILE}`);
  await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent('/documentos')}`);
});

test('el borrado diario de documentos no corre sin el secreto del cron', async ({ request }) => {
  const anonymous = await request.get('/api/cron/documentos');
  expect(anonymous.status()).toBe(401);
  const wrong = await request.get('/api/cron/documentos', {
    headers: { Authorization: 'Bearer un-secreto-que-no-es' },
  });
  expect(wrong.status()).toBe(401);
});
