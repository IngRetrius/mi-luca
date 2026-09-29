import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';

/**
 * Datos del flujo de Google que viajan de /auth/start a /auth/callback en cookies de corta
 * duración, porque la URL de retorno registrada en Supabase debe ser exacta y no admite parámetros.
 */
const NEXT_COOKIE = 'ml_auth_next';
const POPUP_COOKIE = 'ml_auth_popup';
const MAX_AGE_SECONDS = 10 * 60;

export const OAUTH_PROVIDERS = ['google'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return OAUTH_PROVIDERS.some((provider) => provider === value);
}

function cookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    // Lax: el navegador las envía en la redirección de vuelta desde Google, que es una navegación.
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
    path: '/auth',
  };
}

export function saveOAuthFlow(
  request: NextRequest,
  response: NextResponse,
  flow: { next: string; popup: boolean },
): void {
  const options = { ...cookieOptions(request), maxAge: MAX_AGE_SECONDS };
  response.cookies.set(NEXT_COOKIE, flow.next, options);
  response.cookies.set(POPUP_COOKIE, flow.popup ? '1' : '0', options);
}

export function readOAuthFlow(request: NextRequest): { next: string | undefined; popup: boolean } {
  return {
    next: request.cookies.get(NEXT_COOKIE)?.value,
    popup: request.cookies.get(POPUP_COOKIE)?.value === '1',
  };
}

export function clearOAuthFlow(request: NextRequest, response: NextResponse): void {
  const options = { ...cookieOptions(request), maxAge: 0 };
  response.cookies.set(NEXT_COOKIE, '', options);
  response.cookies.set(POPUP_COOKIE, '', options);
}
