import type { CurrencyCode } from '@miluca/domain';

export interface CountryLocale {
  readonly locale: string;
  readonly currency: CurrencyCode;
}

/** Países habilitados hoy. Se agregan más sin cambiar el resto del código (RN-018). */
export const COUNTRY_LOCALES: Readonly<Record<string, CountryLocale>> = {
  CO: { locale: 'es-CO', currency: 'COP' },
  ES: { locale: 'es-ES', currency: 'EUR' },
};
