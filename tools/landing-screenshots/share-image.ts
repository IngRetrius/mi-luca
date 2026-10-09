import { writeFile } from 'node:fs/promises';

import type { Browser } from '@playwright/test';

/** Tamaño de la vista previa de un enlace (Open Graph): 1200 x 630 px. */
const SIZE = { width: 1200, height: 630 } as const;

/**
 * Imagen para compartir el landing (`app/opengraph-image.png`): el logo, el nombre, el título y la
 * ranura naranja, con la tipografía y los colores de la app. Toma los textos del landing en español
 * (el idioma de quien recibe el enlace) y escribe también su texto alternativo.
 */
export async function captureShareImage(browser: Browser, baseUrl: string, file: string) {
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'es-CO',
  });
  await context.addCookies([{ name: 'miluca-lang', value: 'es', url: baseUrl }]);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const hero = page.locator('section[aria-labelledby="hero-title"]');
  const title = (await hero.locator('h1').innerText()).trim();
  const tagline = (await hero.locator('p').first().innerText()).trim();

  // La composición se arma con el DOM de la propia página: hereda las fuentes y los tokens.
  await page.evaluate(
    ({ title, tagline, size }) => {
      const element = (tag: string, style: string, text?: string) => {
        const node = document.createElement(tag);
        node.setAttribute('style', style);
        if (text) node.textContent = text;
        return node;
      };
      const canvas = element(
        'div',
        `width:${size.width}px;height:${size.height}px;box-sizing:border-box;display:flex;align-items:center;gap:72px;padding:0 96px;background:#FFFFFF;font-family:var(--font-sans)`,
      );
      const logo = element('img', 'width:300px;height:300px;flex-shrink:0');
      logo.setAttribute('src', '/icons/icon-512.png');
      const text = element('div', 'display:flex;flex-direction:column;gap:28px');
      text.append(
        element('div', 'font-size:40px;font-weight:600;color:var(--ml-brand)', 'MiLuca'),
        element(
          'div',
          'font-size:64px;line-height:1.1;font-weight:600;color:var(--ml-brand);text-wrap:balance',
          title,
        ),
        element('div', 'width:96px;height:10px;border-radius:9999px;background:var(--ml-accent)'),
        element('div', 'font-size:32px;color:var(--ml-link)', tagline),
      );
      canvas.append(logo, text);
      document.body.replaceChildren(canvas);
      document.body.setAttribute('style', 'margin:0;padding:0;background:#FFFFFF');
    },
    { title, tagline, size: SIZE },
  );
  await page.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({ path: file, clip: { x: 0, y: 0, ...SIZE } });
  // Sin salto de línea al final: Next copia el archivo tal cual en `og:image:alt`.
  await writeFile(file.replace(/\.png$/, '.alt.txt'), `MiLuca. ${title}`);
  await context.close();
}
