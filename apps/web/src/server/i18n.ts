import 'server-only';

import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import {
  displayLocale,
  isLanguage,
  LANGUAGE_COOKIE,
  messagesFor,
  negotiateLanguage,
  type Language,
  type Messages,
  type MessagesAudience,
} from '@miluca/i18n';

import { getViewer } from './viewer';

/**
 * Idioma de la interfaz de esta petición (ADR 0022): el que la persona eligió en este equipo
 * (cookie) o, si no eligió, el primero de su navegador que la app tiene. Una vez por petición.
 */
export const getLanguage = cache(async (): Promise<Language> => {
  const chosen = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(chosen)) return chosen;
  return negotiateLanguage((await headers()).get('accept-language'));
});

/**
 * Para quién son los textos: el cliente con sesión, con su trato y el vocabulario de su país; el
 * asesor y las pantallas sin sesión leen la base, en tú. Si no se puede saber, la base: la
 * pantalla misma mostrará el error.
 */
async function getAudience(): Promise<MessagesAudience> {
  try {
    const viewer = await getViewer();
    return viewer?.role === 'client'
      ? { address: viewer.formOfAddress, country: viewer.countryCode }
      : {};
  } catch {
    return {};
  }
}

/**
 * Los textos de la interfaz en el idioma de la petición y para quien mira: a un cliente de usted
 * le llegan en usted también los errores y avisos sin variantes (G9), y a uno de España, con el
 * vocabulario de España (G8).
 */
export const getMessages = cache(async (): Promise<Messages> => {
  const [language, audience] = await Promise.all([getLanguage(), getAudience()]);
  return messagesFor(language, audience);
});

/**
 * Los textos del idioma, sin trato ni país: para el marco común (el layout raíz, los títulos de
 * página) y lo que solo ve el asesor. No espera a saber quién mira: si el layout raíz lo esperara,
 * llegaría después de la redirección de la página y Safari a veces se queda sin redirigir.
 */
export async function getBaseMessages(): Promise<Messages> {
  return messagesFor(await getLanguage());
}

/**
 * Los textos de lo que se escribe para un cliente y queda guardado o se descarga (la carta, las
 * tareas sugeridas, el PDF): con el vocabulario de su país aunque los pida el asesor.
 */
export async function getCaseMessages(audience: MessagesAudience): Promise<Messages> {
  return messagesFor(await getLanguage(), audience);
}

/**
 * Locale para mostrar un caso: idioma de la interfaz y región del país del cliente. Fechas en el
 * idioma; importes y porcentajes con el formato del país (`formatMoney`, `amountToText`).
 */
export async function getLocale(countryCode: string | null | undefined): Promise<string> {
  return displayLocale(countryCode, await getLanguage());
}

export type PageTitle = keyof Messages['pageTitle'];

/** `generateMetadata` de una página con su título en el idioma de la petición. */
export function pageMetadata(key: PageTitle) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getBaseMessages();
    return { title: key === 'home' ? t.pageTitle.home : `${t.pageTitle[key]} | ${t.app.name}` };
  };
}
