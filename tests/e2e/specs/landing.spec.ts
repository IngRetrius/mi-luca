import { expect, test } from '@playwright/test';

import { TEST_WHATSAPP_DIGITS } from '../contact-env';
import { supabaseConfigured } from '../supabase-env';

// P-G06 Landing y P-G07 Privacidad pública (ADR 0026): se ven sin sesión, sin Supabase salvo los
// avisos. La app corre con el número de prueba de contact-env.ts.

const whatsapp = (message: string) =>
  `https://wa.me/${TEST_WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;

const TITLE = 'Entiende tu dinero: organízalo, sal de deudas y planea tus metas.';
const MORE_INFO = 'Hola, vi la página de MiLuca y quiero saber más.';
const FIRST_SESSION = 'Hola, vi la página de MiLuca y quiero pedir una primera conversación.';

test('sin sesión, la raíz muestra el landing con todas sus secciones', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await expect(page).toHaveTitle('MiLuca | Planificación financiera personal');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  for (const name of [
    'Cómo funciona',
    'Así se ve tu plan',
    'Cómo trabajo',
    'Sobre mí',
    'Tus datos y los límites',
    'Preguntas frecuentes',
    '¿Hablamos?',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
});

test('los dos botones abren WhatsApp, cada uno con su mensaje', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('region', { name: TITLE });
  await expect(hero.getByRole('link', { name: 'Escríbeme por WhatsApp' })).toHaveAttribute(
    'href',
    whatsapp(MORE_INFO),
  );
  await expect(hero.getByRole('link', { name: 'Pedir una primera conversación' })).toHaveAttribute(
    'href',
    whatsapp(FIRST_SESSION),
  );
  const closing = page.getByRole('region', { name: '¿Hablamos?' });
  await expect(closing.getByRole('link', { name: 'Escríbeme por WhatsApp' })).toHaveAttribute(
    'href',
    whatsapp(MORE_INFO),
  );
});

test('Entrar, en la cabecera, lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/entrar');
  await expect(page.getByLabel('Correo', { exact: true })).toBeVisible();
});

test('las tres etapas van en orden, con lo que resuelven y lo que se recibe', async ({ page }) => {
  await page.goto('/');
  const stages = page.getByRole('region', { name: 'Cómo funciona' }).getByRole('listitem');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0).getByRole('heading', { level: 3 })).toHaveText(
    'Presupuesto y bolsillos',
  );
  await expect(stages.nth(1).getByRole('heading', { level: 3 })).toHaveText('Deudas');
  await expect(stages.nth(2).getByText('Qué recibes')).toBeVisible();
});

test('las capturas cargan y avisan que los datos son inventados', async ({ page }) => {
  await page.goto('/');
  const preview = page.getByRole('region', { name: 'Así se ve tu plan' });
  await expect(preview.getByText('Ejemplo con datos inventados.')).toBeVisible();
  const images = preview.getByRole('img');
  await expect(images).toHaveCount(3);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('alt', /teléfono/);
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test('Sobre mí presenta al asesor con su foto, su nombre y su sitio', async ({ page }) => {
  await page.goto('/');
  const about = page.getByRole('region', { name: 'Sobre mí' });
  const photo = about.getByRole('img', { name: 'Juan Perea Possos' });
  await photo.scrollIntoViewIfNeeded();
  await expect
    .poll(() => photo.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
  await expect(about.getByText('Juan Perea Possos', { exact: true })).toHaveAttribute(
    'translate',
    'no',
  );
  await expect(about.getByRole('link', { name: 'juan-perea.dev' })).toHaveAttribute(
    'href',
    'https://www.juan-perea.dev',
  );
});

test('una pregunta frecuente se abre y se cierra', async ({ page }) => {
  await page.goto('/');
  const answer = page.getByText(
    'Sí. Cada etapa es independiente; empiezas por la que más te importe.',
  );
  await expect(answer).toBeHidden();
  const question = page.getByText('¿Puedo hacer solo una etapa?', { exact: true });
  await question.click();
  await expect(answer).toBeVisible();
  await question.click();
  await expect(answer).toBeHidden();
});

test('con el teclado, el primer Tab ofrece saltar al contenido', async ({ page, browserName }) => {
  // Safari (iPhone y iPad) no enfoca enlaces con Tab salvo que se active en sus ajustes.
  test.skip(browserName === 'webkit', 'Safari no enfoca enlaces con Tab');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Ir al contenido' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/#contenido');
});

test('no habla de precios ni de que el servicio sea gratis', async ({ page }) => {
  // Decisión del asesor del 09/10/2026: el precio no se menciona, ni para decir que no cuesta.
  await page.goto('/');
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/gratis|sin costo|precio|cuánto cuesta|\$\s?\d/i);
});

test('ninguna petición sale a otro dominio', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).host !== 'localhost:3100') foreign.push(request.url());
  });
  await page.goto('/');
  // Las capturas cargan al acercarse: se recorre la página entera.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

test('el enlace se ve bien al compartirlo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'MiLuca | Planificación financiera personal',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /sal de deudas/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/opengraph-image\.png/,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    `MiLuca. ${TITLE}`,
  );
  // La raíz del sitio, con el dominio de producción en Vercel (siteUrl).
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /^https?:\/\/[^/]+\/?$/,
  );
});

test('robots.txt deja indexar solo las páginas públicas y sitemap.xml las lista', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /$');
  expect(robots).toContain('Allow: /privacidad$');
  expect(robots).toContain('Disallow: /');
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const body = await sitemap.text();
  expect(body).toMatch(/<loc>[^<]+\/<\/loc>/);
  expect(body).toMatch(/<loc>[^<]+\/privacidad<\/loc>/);
});

test('la privacidad pública abre sin sesión', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Lee el aviso de privacidad' }).click();
  await expect(page).toHaveURL('/privacidad');
  await expect(page).toHaveTitle('Aviso de privacidad | MiLuca');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aviso de privacidad');
  if (supabaseConfigured) {
    await expect(page.getByRole('heading', { level: 2, name: 'Colombia' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'España' })).toBeVisible();
  } else {
    // Por el texto: al llegar con un enlace, Next agrega su anunciador de rutas, también un alert.
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'No se pudieron cargar los avisos. Intenta de nuevo en unos minutos.' }),
    ).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'retrius2001@gmail.com' }).first()).toHaveAttribute(
    'href',
    'mailto:retrius2001@gmail.com',
  );
});

test('en el escritorio, la presentación muestra el reporte en un teléfono', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'La captura de la presentación es del escritorio');
  await page.goto('/');
  const hero = page.getByRole('region', { name: TITLE });
  await expect(hero.getByRole('img', { name: /Reporte de presupuesto/ })).toBeVisible();
});

test.describe('con el navegador en inglés', () => {
  test.use({ locale: 'en-US' });

  test('el landing sale en inglés, con los mensajes de WhatsApp en inglés', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('MiLuca | Personal financial planning');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Understand your money: organize it, get out of debt and plan your goals.',
    );
    await expect(
      page.getByRole('link', { name: 'Message me on WhatsApp' }).first(),
    ).toHaveAttribute('href', whatsapp("Hi, I saw the MiLuca page and I'd like to know more."));
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});
