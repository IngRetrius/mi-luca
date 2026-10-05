'use server';

import { cookies } from 'next/headers';

import { isLanguage, LANGUAGE_COOKIE } from '@miluca/i18n';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda en este equipo el idioma elegido (ADR 0022). No va a la base: cada equipo recuerda el
 * suyo, y sin elección se usa el del navegador. Al poner la cookie, Next vuelve a pintar la ruta
 * con los textos nuevos sin desmontar la pantalla.
 */
export async function setLanguage(formData: FormData): Promise<void> {
  const language = formData.get('language');
  if (!isLanguage(language)) return;
  // Solo guarda "es" o "en": no es un dato sensible, así que no lleva `secure` y sirve también en
  // http://localhost, donde Safari rechaza las cookies seguras.
  (await cookies()).set(LANGUAGE_COOKIE, language, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: true,
  });
}
