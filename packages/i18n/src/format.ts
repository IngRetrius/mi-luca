import type { CurrencyCode } from '@miluca/domain';

import { numberLocale } from './languages';

/**
 * Decimales que se muestran por moneda cuando la costumbre local difiere de ISO 4217.
 * En Colombia los pesos se muestran sin decimales (1.750.905), aunque ISO define dos.
 */
const DISPLAY_DECIMALS: Readonly<Record<string, number>> = {
  COP: 0,
  CLP: 0,
};

export interface MoneyFormatOptions {
  /** Fuerza el número de decimales. */
  readonly decimals?: number;
}

/**
 * Formatea un importe con el formato del país del cliente, en cualquier idioma de la interfaz:
 * `en-CO` y `es-CO` dan lo mismo (`numberLocale`).
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  locale: string,
  options: MoneyFormatOptions = {},
): string {
  const decimals = options.decimals ?? DISPLAY_DECIMALS[currency];
  return new Intl.NumberFormat(numberLocale(locale), {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    ...(decimals !== undefined && {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  }).format(amount);
}

/** Formatea una razón (0,305) como porcentaje (30,5 %), con el formato del país. */
export function formatPercent(ratio: number, locale: string, decimals = 1): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/**
 * Formatea una fecha con día, mes y año en letras ("6 de octubre de 2026"; con `en-CO`,
 * "October 6, 2026"): el idioma sale del locale y no del país. La zona horaria es la
 * del país del cliente: el servidor corre en UTC y, sin ella, una fecha cerca de la medianoche
 * saldría con el día equivocado.
 */
export function formatDate(date: Date | string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone }).format(new Date(date));
}
