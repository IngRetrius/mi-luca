/** Hasta este valor cabe en `numeric(18, 2)`. */
const MAX_AMOUNT = 9_999_999_999_999_999;
const AMOUNT = /^\d+(,\d{1,2})?$/;

/**
 * Lee un importe escrito como se escribe en Colombia y España: punto de miles y coma decimal
 * ("1.750.905", "130.000,50"). Acepta espacios y el símbolo de la moneda. Vacío es null; algo que
 * no es un importe de 0 o más con hasta dos decimales es NaN.
 */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/\b[A-Z]{3}\b/g, '').replace(/[\s$€]/g, '');
  if (clean === '') return null;
  // Los puntos de miles van cada tres cifras; si no, el número está mal escrito.
  const [whole = '', ...rest] = clean.split(',');
  if (rest.length > 1) return Number.NaN;
  if (whole.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(whole)) return Number.NaN;
  const normalized = `${whole.replaceAll('.', '')}${rest.length ? `,${rest[0]}` : ''}`;
  if (!AMOUNT.test(normalized)) return Number.NaN;
  const value = Number(normalized.replace(',', '.'));
  return value <= MAX_AMOUNT ? value : Number.NaN;
}

/** Un importe guardado, para volver a mostrarlo en un campo con el mismo formato que se escribe. */
export function amountToText(value: number | null, locale: string): string {
  if (value === null) return '';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: true }).format(
    value,
  );
}
