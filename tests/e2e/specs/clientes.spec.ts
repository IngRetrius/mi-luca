import { expect, test } from '@playwright/test';

// Sin Supabase (CI): las pantallas del asesor y P-G02 exigen sesión y vuelven a la ruta pedida.
// El flujo con sesión (lista vacía, crear perfil, ficha, P-G02; en F2, presupuesto con filtros,
// alta y edición con vista previa, ingresos, seguridad social, ingreso base, monedas, perfil y
// supuestos, costo de vida, cifras de la ficha y aviso con el antes y después; en F3, flujo, fondo,
// bolsillos y bancos, bolsillo de cada gasto, cobros, patrimonio, prueba de realidad y supuestos del
// plan, con sus errores y el foco en el primero; después de F3, la lista de gastos típicos del país,
// P-A06b; en F4, deudas con su plan de pago y el método, y el seguimiento cuota a cuota; en F5, inversión con perfil,
// supuestos y proyección, metas con la calculadora de viaje, seguros con la suma asegurada de vida y el
// patrimonio completo; en F7, control mensual y plan de acción con las tareas sugeridas, la carta y
// las notas con sus cifras, publicadas y entregadas con el plan, y el seguimiento con las revisiones
// y la ficha de continuidad) se verificó contra Supabase local.

const CLIENT = '00000000-0000-4000-8000-000000000001';

for (const path of [
  '/clientes',
  '/clientes/nuevo',
  '/sin-invitacion',
  `/clientes/${CLIENT}/presupuesto`,
  `/clientes/${CLIENT}/presupuesto/nuevo`,
  `/clientes/${CLIENT}/presupuesto/lista`,
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
  `/clientes/${CLIENT}/supuestos`,
  `/clientes/${CLIENT}/flujo`,
  `/clientes/${CLIENT}/fondo`,
  `/clientes/${CLIENT}/bolsillos`,
  `/clientes/${CLIENT}/bolsillos/nuevo`,
  `/clientes/${CLIENT}/bolsillos/${CLIENT}`,
  `/clientes/${CLIENT}/bolsillos/fondo`,
  `/clientes/${CLIENT}/bolsillos/meses-sin-ingreso`,
  `/clientes/${CLIENT}/bolsillos/bancos`,
  `/clientes/${CLIENT}/bolsillos/bancos/nuevo`,
  `/clientes/${CLIENT}/bolsillos/bancos/${CLIENT}`,
  `/clientes/${CLIENT}/deudas`,
  `/clientes/${CLIENT}/deudas/nuevo`,
  `/clientes/${CLIENT}/deudas/panel`,
  `/clientes/${CLIENT}/deudas/${CLIENT}`,
  `/clientes/${CLIENT}/deudas/${CLIENT}/cuotas`,
  `/clientes/${CLIENT}/deudas/${CLIENT}/cuotas/1`,
  `/clientes/${CLIENT}/cobros`,
  `/clientes/${CLIENT}/cobros/nuevo`,
  `/clientes/${CLIENT}/cobros/${CLIENT}`,
  `/clientes/${CLIENT}/patrimonio`,
  `/clientes/${CLIENT}/patrimonio/nuevo`,
  `/clientes/${CLIENT}/patrimonio/${CLIENT}`,
  `/clientes/${CLIENT}/prueba-de-realidad`,
  `/clientes/${CLIENT}/inversion`,
  `/clientes/${CLIENT}/inversion/nueva`,
  `/clientes/${CLIENT}/inversion/perfil`,
  `/clientes/${CLIENT}/inversion/supuestos`,
  `/clientes/${CLIENT}/inversion/${CLIENT}`,
  `/clientes/${CLIENT}/metas`,
  `/clientes/${CLIENT}/metas/nueva`,
  `/clientes/${CLIENT}/metas/${CLIENT}`,
  `/clientes/${CLIENT}/seguros`,
  `/clientes/${CLIENT}/seguros/nuevo`,
  `/clientes/${CLIENT}/seguros/supuestos`,
  `/clientes/${CLIENT}/seguros/${CLIENT}`,
  `/clientes/${CLIENT}/control-mensual`,
  `/clientes/${CLIENT}/plan-de-accion`,
  `/clientes/${CLIENT}/plan-de-accion/nueva`,
  `/clientes/${CLIENT}/plan-de-accion/${CLIENT}`,
  `/clientes/${CLIENT}/carta`,
  `/clientes/${CLIENT}/notas`,
  `/clientes/${CLIENT}/seguimiento`,
  `/clientes/${CLIENT}/seguimiento/ficha`,
  `/clientes/${CLIENT}/entrega`,
  `/clientes/${CLIENT}/planes/${CLIENT}`,
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

test('el PDF de un plan entregado sin sesión lleva a Entrar y vuelve al plan', async ({ page }) => {
  const plan = `/clientes/${CLIENT}/planes/${CLIENT}`;
  await page.goto(`${plan}/pdf`);
  await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(plan)}`);
});

test('una ruta que no existe muestra la página en español', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe');
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'No encontramos esta página' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
});
