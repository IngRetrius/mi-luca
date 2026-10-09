import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium, devices, type Browser, type BrowserContext, type Page } from '@playwright/test';

import {
  ADVISOR,
  CASE_LANGUAGES,
  CLIENT,
  prepareCase,
  type CaseLanguage,
} from './fictitious-case.ts';
import { Accounts, localSupabase, type LocalSupabase } from './local-supabase.ts';
import { captureShareImage } from './share-image.ts';
import { toWebp } from './webp.ts';

/**
 * Capturas de "Así se ve tu plan" del landing (ADR 0026), con un caso inventado en Supabase local:
 * en cada idioma arma el caso con sus nombres en ese idioma, entrega los reportes de presupuesto y de
 * deudas como asesor y fotografía dos pantallas del cliente. Al final, la imagen para compartir el
 * enlace (`app/opengraph-image.png`). Se vuelve a correr cuando cambie la app o el título.
 *
 *   pnpm --filter @miluca/landing-screenshots capture [--url http://localhost:3000]
 *
 * Sin `--url`, arranca la app en modo desarrollo contra Supabase local en el puerto 3200.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const WEB = `${ROOT}apps/web`;
const OUTPUT = `${WEB}/public/landing`;
const SHARE_IMAGE = `${WEB}/src/app/opengraph-image.png`;
const PORT = 3200;

/** Calidad del WebP: el texto sale nítido y cada captura pesa unos 70 KB. */
const WEBP_QUALITY = 0.85;

/** Un teléfono de 390 x 844 px a doble densidad: 780 x 1688 px (`SCREENSHOT_SIZE` del landing). */
const PHONE = { ...devices['iPhone 13'], deviceScaleFactor: 2, colorScheme: 'light' as const };

interface Deliveries {
  readonly presupuesto: string;
  readonly deudas: string;
}

/** Qué se fotografía: el archivo, la pantalla y, si hace falta, la sección que va arriba. */
const SCREENS = [
  {
    file: 'budget',
    path: (d: Deliveries) => `/mi-plan?version=${d.presupuesto}`,
    anchor: 'plan-figures',
  },
  { file: 'debts', path: (d: Deliveries) => `/mi-plan?version=${d.deudas}`, anchor: 'plan-debts' },
] as const;

/** Arranca `next dev` contra Supabase local, sin claves del remoto ni número de contacto. */
async function startApp(env: LocalSupabase): Promise<{ url: string; stop: () => void }> {
  const url = `http://localhost:${PORT}`;
  const child: ChildProcess = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--port', String(PORT)],
    {
      cwd: WEB,
      stdio: 'ignore',
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: env.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
        SUPABASE_SECRET_KEY: env.secretKey,
        ANTHROPIC_API_KEY: '',
        CONTACT_WHATSAPP: '',
      },
    },
  );
  const stop = () => child.kill('SIGTERM');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${url}/entrar`)).ok) return { url, stop };
    } catch {
      // Todavía arrancando.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  stop();
  throw new Error(`La app no respondió en ${url}.`);
}

async function signIn(page: Page, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/entrar`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/entrar')),
    page.locator('form:has(input[name="password"]) button[type="submit"]').click(),
  ]);
}

/**
 * El asesor entrega el reporte de una etapa (P-A14), con una nota en cada control que la pide.
 * Devuelve el id de la entrega, que queda en la dirección del plan entregado.
 */
async function deliver(page: Page, baseUrl: string, clientId: string, stage: string) {
  await page.goto(`${baseUrl}/clientes/${clientId}/entrega?etapa=${stage}`);
  const form = page.locator('form:has(input[name="label"])');
  for (const note of await form.locator('textarea[required]').all()) {
    await note.fill('Caso de ejemplo para las capturas del landing.');
  }
  await Promise.all([
    page.waitForURL(/\/planes\/[0-9a-f-]{36}$/),
    form.locator('button[type="submit"]').click(),
  ]);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  if (!id) throw new Error(`No se pudo entregar la etapa ${stage}.`);
  return id;
}

/** Sin el indicador de Next en modo desarrollo ni el cursor de texto parpadeando. */
const CLEAN_CSS = 'nextjs-portal{display:none!important}*{caret-color:transparent!important}';

/** Las pantallas del cliente en un idioma, con la cookie de idioma de la app, en WebP. */
async function shoot(
  browser: Browser,
  context: BrowserContext,
  baseUrl: string,
  deliveries: Deliveries,
  language: CaseLanguage,
) {
  await context.addCookies([{ name: 'miluca-lang', value: language, url: baseUrl }]);
  const page = await context.newPage();
  for (const screen of SCREENS) {
    await page.goto(`${baseUrl}${screen.path(deliveries)}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: CLEAN_CSS });
    await page.evaluate(() => document.fonts.ready);
    if (screen.anchor) {
      // La sección del título queda arriba, con un poco de aire.
      await page.evaluate((id) => {
        const title = document.getElementById(id);
        const target = title?.closest('section') ?? title;
        if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 24);
      }, screen.anchor);
    }
    const png = await page.screenshot({ animations: 'disabled' });
    const path = `${OUTPUT}/${screen.file}-${language}.webp`;
    await writeFile(path, await toWebp(browser, png, WEBP_QUALITY));
    console.log(`  ${path.slice(ROOT.length)}`);
  }
  await page.close();
}

/**
 * Un idioma completo: el caso con sus nombres en ese idioma, las dos entregas del asesor y las
 * capturas del cliente. Cada idioma rehace el caso desde cero.
 */
async function captureLanguage(
  browser: Browser,
  baseUrl: string,
  env: LocalSupabase,
  language: CaseLanguage,
) {
  const accounts = new Accounts(env);
  // Contraseña nueva en cada corrida: las cuentas son locales y de usar y tirar.
  const password = `Capturas-${randomUUID()}`;
  const clientId = await prepareCase(env, accounts, password, language);

  const advisor = await browser.newContext({ locale: 'es-CO' });
  const advisorPage = await advisor.newPage();
  await signIn(advisorPage, baseUrl, ADVISOR.email, password);
  const deliveries: Deliveries = {
    presupuesto: await deliver(advisorPage, baseUrl, clientId, 'presupuesto'),
    deudas: await deliver(advisorPage, baseUrl, clientId, 'deudas'),
  };
  await advisor.close();

  const client = await browser.newContext({ ...PHONE, locale: 'es-CO' });
  await signIn(await client.newPage(), baseUrl, CLIENT.email, password);
  await shoot(browser, client, baseUrl, deliveries, language);
  await client.close();
}

/**
 * Borra las capturas de la corrida anterior (`<pantalla>-<idioma>.webp`), para que no queden las de
 * pantallas que ya no se usan. El resto de la carpeta, como la foto del asesor, no se toca.
 */
async function removeOldScreenshots() {
  await mkdir(OUTPUT, { recursive: true });
  const pattern = new RegExp(`-(${CASE_LANGUAGES.join('|')})\\.webp$`);
  for (const file of await readdir(OUTPUT)) {
    if (pattern.test(file)) await rm(`${OUTPUT}/${file}`);
  }
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: 'string' } } });
  const env = localSupabase(ROOT);
  await removeOldScreenshots();
  const app = values.url ? { url: values.url, stop: () => {} } : await startApp(env);
  const browser = await chromium.launch();
  try {
    for (const language of CASE_LANGUAGES) {
      console.log(`Caso inventado y capturas (${language}):`);
      await captureLanguage(browser, app.url, env, language);
    }
    await captureShareImage(browser, app.url, SHARE_IMAGE);
    console.log(`Imagen para compartir:\n  ${SHARE_IMAGE.slice(ROOT.length)}`);
  } finally {
    await browser.close();
    app.stop();
  }
}

await main();
