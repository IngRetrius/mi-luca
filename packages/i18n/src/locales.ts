import type { CurrencyCode } from '@miluca/domain';

export interface CountryLocale {
  readonly locale: string;
  readonly currency: CurrencyCode;
  /** Zona horaria IANA con la que se muestran las fechas del cliente. */
  readonly timeZone: string;
}

/** Países habilitados hoy. Se agregan más sin cambiar el resto del código (RN-018). */
export const COUNTRY_LOCALES: Readonly<Record<string, CountryLocale>> = {
  CO: { locale: 'es-CO', currency: 'COP', timeZone: 'America/Bogota' },
  ES: { locale: 'es-ES', currency: 'EUR', timeZone: 'Europe/Madrid' },
};
