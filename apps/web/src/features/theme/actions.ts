'use server';

import { cookies } from 'next/headers';

import { isThemePreference, THEME_COOKIE } from '@miluca/ui';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda en este equipo el tema elegido (ADR 0033), como el idioma: no va a la base y cada equipo
 * recuerda el suyo. "Automático" borra la cookie para que vuelva a mandar el equipo. Al cambiar la
 * cookie, Next vuelve a pintar la ruta con el tema nuevo sin desmontar la pantalla.
 */
export async function setTheme(formData: FormData): Promise<void> {
  const theme = formData.get('theme');
  if (!isThemePreference(theme)) return;
  const store = await cookies();
  if (theme === 'system') {
    store.delete(THEME_COOKIE);
    return;
  }
  // Solo guarda "light" o "dark": no es un dato sensible, así que no lleva `secure` y sirve también
  // en http://localhost, donde Safari rechaza las cookies seguras.
  store.set(THEME_COOKIE, theme, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
  });
}
