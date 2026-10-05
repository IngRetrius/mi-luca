import { COUNTRY_LOCALES } from './locales';

/** Idiomas de la interfaz (ADR 0022). El primero es el de siempre: el que se usa si no hay otro. */
export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

/** Cookie con el idioma que eligió la persona en este equipo. Manda sobre el del navegador. */
export const LANGUAGE_COOKIE = 'miluca-lang';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Idioma según la cabecera `Accept-Language` del navegador: el primero que la app tiene, en el
 * orden de preferencia (`q`). Sin cabecera o sin coincidencia, español.
 */
export function negotiateLanguage(acceptLanguage: string | null | undefined): Language {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag !== '' && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Locale con que se muestra un caso: el idioma de la interfaz con la región del país del cliente
 * (`en-CO`, `es-ES`). Las fechas y los meses salen en el idioma; los importes y porcentajes siguen
 * el formato del país (`numberLocale`).
 */
export function displayLocale(countryCode: string | null | undefined, language: Language): string {
  const country = countryCode ? COUNTRY_LOCALES[countryCode] : undefined;
  if (!country) return language;
  const region = country.locale.split('-')[1];
  return region ? `${language}-${region}` : language;
}

/**
 * Nombre de un país en el idioma de la interfaz. En español, el de la tabla `countries`; en otro
 * idioma, el de `Intl.DisplayNames` (Spain, Colombia), o el de la tabla si no lo conoce.
 */
export function countryLabel(code: string, language: Language, spanishName: string): string {
  if (language === 'es') return spanishName;
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? spanishName;
  } catch {
    return spanishName;
  }
}

/** El idioma de un locale de presentación (`en-CO` es inglés); español si no es uno de la app. */
export function localeLanguage(locale: string): Language {
  const language = locale.split('-')[0]?.toLowerCase();
  return isLanguage(language) ? language : DEFAULT_LANGUAGE;
}

/**
 * Locale para importes y porcentajes: el del país de la región, aunque la interfaz esté en otro
 * idioma. Así un cliente de Colombia ve 1.750.905 en inglés y en español, como en su banco, y los
 * campos se escriben igual en los dos idiomas (`parseAmount`).
 */
export function numberLocale(locale: string): string {
  const region = locale.split('-')[1]?.toUpperCase();
  if (!region) return locale;
  return COUNTRY_LOCALES[region]?.locale ?? locale;
}
