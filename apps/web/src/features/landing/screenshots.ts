import type { Language } from '@miluca/i18n';

/**
 * Pantallas del cliente que muestra "Así se ve tu plan", con un caso inventado. Las genera
 * `tools/landing-screenshots` en los dos idiomas; la clave es la de `landing.preview.screens`.
 */
export const PREVIEW_SCREENS = [
  { key: 'budget', file: 'budget' },
  { key: 'debts', file: 'debts' },
  { key: 'myData', file: 'my-data' },
] as const;

export type PreviewScreen = (typeof PREVIEW_SCREENS)[number];

/**
 * Cada captura es un teléfono de 390 x 844 px a doble densidad, ya en WebP (unos 70 KB): se sirve
 * tal cual, sin el optimizador de imágenes, que no hace falta y gasta la cuota de Vercel.
 */
export const SCREENSHOT_SIZE = { width: 780, height: 1688 } as const;

/** Ruta pública de una captura en el idioma de la página. */
export function screenshotSrc(screen: PreviewScreen, language: Language): string {
  return `/landing/${screen.file}-${language}.webp`;
}
