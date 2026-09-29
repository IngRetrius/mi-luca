/** La app corre instalada en la pantalla de inicio (no en una pestaña del navegador). */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

export type Platform = 'ios' | 'android' | 'other';

/**
 * Sistema del celular según el User-Agent, para elegir las instrucciones de P-C03. Un iPad con
 * iPadOS se presenta como Mac y cae en 'other', que muestra las instrucciones generales.
 */
export function detectPlatform(userAgent: string | null): Platform {
  if (!userAgent) return 'other';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'other';
}
