import type { Browser } from '@playwright/test';

/**
 * Convierte una captura PNG a WebP con el codificador del propio Chromium (lienzo y `toDataURL`),
 * sin dependencias nuevas. El landing sirve el archivo tal cual, sin el optimizador de imágenes.
 */
export async function toWebp(browser: Browser, png: Buffer, quality: number): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(
      async ({ source, quality }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')?.drawImage(image, 0, 0);
        return canvas.toDataURL('image/webp', quality);
      },
      { source: `data:image/png;base64,${png.toString('base64')}`, quality },
    );
    if (!dataUrl.startsWith('data:image/webp;base64,')) {
      throw new Error('Este Chromium no codifica WebP.');
    }
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  } finally {
    await page.close();
  }
}
