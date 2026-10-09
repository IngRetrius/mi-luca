import en from '../messages/en.json' with { type: 'json' };
import esES from '../messages/es-ES.json' with { type: 'json' };
import esUsted from '../messages/es-usted.json' with { type: 'json' };
import es from '../messages/es.json' with { type: 'json' };
import type { Language } from './languages';

export { formatDate, formatMoney, formatPercent } from './format';
export type { MoneyFormatOptions } from './format';
export {
  BUDGET_CATALOGS,
  budgetCatalog,
  catalogConceptNames,
  catalogPocketNames,
} from './budget-catalog';
export type { BudgetCatalog, CatalogCategory, CatalogConcept } from './budget-catalog';
export {
  AUTOMATIC_CATEGORIES,
  BUDGET_CATEGORIES,
  canonicalCategory,
  compareCategories,
  categoryLabel,
} from './categories';
export {
  countryLabel,
  DEFAULT_LANGUAGE,
  displayLocale,
  isLanguage,
  LANGUAGE_COOKIE,
  LANGUAGES,
  localeLanguage,
  negotiateLanguage,
  numberLocale,
} from './languages';
export type { Language } from './languages';
export { COUNTRY_LOCALES } from './locales';
export type { CountryLocale } from './locales';

export type Messages = typeof es;

/** Textos de la interfaz por idioma (ADR 0022). El inglés tiene que tener la misma forma que el español. */
export const messages: Readonly<Record<Language, Messages>> = { es, en };

/** Trato con el que la app le habla al cliente (lo elige el asesor en P-A02). */
export type FormOfAddress = 'tu' | 'usted';

export type MessagesOverlay<T> = {
  readonly [K in keyof T]?: T[K] extends string ? string : MessagesOverlay<T[K]>;
};

/**
 * Textos en usted de lo que no tiene variantes `{ tu, usted }`: los errores de los formularios y
 * los avisos comunes que ve el cliente. Solo el español distingue el trato.
 */
export const USTED_MESSAGES: Readonly<Record<Language, MessagesOverlay<Messages>>> = {
  es: esUsted,
  en: {},
};

/**
 * Vocabulario de un país donde difiere del de la base (Colombia): "piso" y "coche" en España, sus
 * tipos de préstamo, la TAE en lugar de la EA. Por idioma y código de país.
 */
export const COUNTRY_MESSAGES: Readonly<
  Record<Language, Readonly<Partial<Record<string, MessagesOverlay<Messages>>>>>
> = {
  es: { ES: esES },
  en: {},
};

function overlay<T>(base: T, changes: MessagesOverlay<T> | undefined): T {
  if (changes === undefined) return base;
  if (typeof base !== 'object' || base === null) return changes as T;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(changes)) {
    result[key] = overlay(result[key], value as MessagesOverlay<unknown>);
  }
  return result as T;
}

export interface MessagesAudience {
  /** Trato de quien lee; sin él, tú. */
  readonly address?: FormOfAddress;
  /** País del cliente cuyo caso se lee; sin él, el vocabulario de la base. */
  readonly country?: string | null;
}

const overlaid = new Map<string, Messages>();

/**
 * Los textos de un idioma para quien los lee: con el vocabulario de su país y en su trato. El
 * asesor y las pantallas sin sesión leen la base, en tú.
 */
export function messagesFor(
  language: Language,
  { address = 'tu', country }: MessagesAudience = {},
): Messages {
  const countryChanges = country ? COUNTRY_MESSAGES[language][country] : undefined;
  const addressChanges = address === 'usted' ? USTED_MESSAGES[language] : undefined;
  if (!countryChanges && !addressChanges) return messages[language];
  const key = `${language}|${countryChanges ? country : ''}|${addressChanges ? address : ''}`;
  let result = overlaid.get(key);
  if (!result) {
    result = overlay(overlay(messages[language], countryChanges), addressChanges);
    overlaid.set(key, result);
  }
  return result;
}
