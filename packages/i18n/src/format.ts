import type { CurrencyCode } from '@miluca/domain';

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

/** Formatea un importe con el formato del país del cliente. */
export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  locale: string,
  options: MoneyFormatOptions = {},
): string {
  const decimals = options.decimals ?? DISPLAY_DECIMALS[currency];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    ...(decimals !== undefined && {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  }).format(amount);
}

/** Formatea una razón (0,305) como porcentaje (30,5 %). */
export function formatPercent(ratio: number, locale: string, decimals = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(ratio);
}
