/** Canal por el que la ventana de Google avisa a la app instalada que ya hay sesión. */
export const AUTH_CHANNEL = 'miluca-auth';

export type AuthChannelMessage = { readonly type: 'signed-in' } | { readonly type: 'failed' };

/** La app corre instalada en la pantalla de inicio (no en una pestaña del navegador). */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}
