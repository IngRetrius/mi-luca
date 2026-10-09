import type { Language } from '@miluca/i18n';

/**
 * Capturas del cliente que acompañan a las etapas en "Cómo funciona", con un caso inventado. Las
 * genera `tools/landing-screenshots` en los dos idiomas; la clave es la de
 * `landing.stages.screenshots`. La tercera etapa va sin captura.
 */
export const STAGE_SCREENS = [{ key: 'budget' }, { key: 'debts' }, null] as const;

export type StageScreen = NonNullable<(typeof STAGE_SCREENS)[number]>;

/**
 * Cada captura es un teléfono de 390 x 844 px a doble densidad, ya en WebP (unos 70 KB): se sirve
 * tal cual, sin el optimizador de imágenes, que no hace falta y gasta la cuota de Vercel.
 */
export const SCREENSHOT_SIZE = { width: 780, height: 1688 } as const;

/** Ruta pública de una captura en el idioma de la página. */
export function screenshotSrc(screen: StageScreen, language: Language): string {
  return `/landing/${screen.key}-${language}.webp`;
}
