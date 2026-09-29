/** Canal por el que la ventana de Google avisa a la app instalada que ya hay sesión. */
export const AUTH_CHANNEL = 'miluca-auth';

export type AuthChannelMessage = { readonly type: 'signed-in' } | { readonly type: 'failed' };
