import 'server-only';

import { cookies } from 'next/headers';

import { isInvitationToken } from './validation';

/**
 * Estado del flujo del cliente entre P-C01 y la aceptación (02-arquitectura, 5.3), en cookies
 * `HttpOnly` de una hora limitadas a /invitacion. Así el token sale de la URL después de la
 * primera pantalla y sobrevive a la ida y vuelta por Google.
 */
const TOKEN_COOKIE = 'ml_inv_token';
const CONSENT_COOKIE = 'ml_inv_consent';
const MAX_AGE_SECONDS = 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InvitationFlow {
  readonly token: string | null;
  /** Textos legales aceptados en P-C02; null si aún no pasó por allí. */
  readonly grantedTexts: readonly string[] | null;
}

const options = {
  httpOnly: true,
  // Lax: el navegador las envía en la vuelta desde Google, que es una navegación.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/invitacion',
  maxAge: MAX_AGE_SECONDS,
};

export async function readInvitationFlow(): Promise<InvitationFlow> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const consent = store.get(CONSENT_COOKIE)?.value;
  const grantedTexts =
    consent === undefined ? null : consent.split(',').filter((id) => UUID.test(id));
  return { token: isInvitationToken(token) ? token : null, grantedTexts };
}

/** P-C01: guarda el token y borra un consentimiento de una invitación anterior. */
export async function startInvitationFlow(token: string): Promise<void> {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, options);
  store.delete({ name: CONSENT_COOKIE, path: options.path });
}

/** P-C02: guarda los textos aceptados hasta que exista la sesión. */
export async function saveGrantedTexts(ids: readonly string[]): Promise<void> {
  const store = await cookies();
  store.set(CONSENT_COOKIE, ids.join(','), options);
}

export async function clearInvitationFlow(): Promise<void> {
  const store = await cookies();
  store.delete({ name: TOKEN_COOKIE, path: options.path });
  store.delete({ name: CONSENT_COOKIE, path: options.path });
}
