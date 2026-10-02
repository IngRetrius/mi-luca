/** Hasta este valor cabe en `numeric(18, 2)`. */
const MAX_AMOUNT = 9_999_999_999_999_999;

/**
 * Lee un importe escrito como se escribe en Colombia y España: punto de miles y coma decimal
 * ("1.750.905", "130.000,50"). Acepta espacios y el símbolo de la moneda. Vacío es null; algo que
 * no es un importe de 0 o más con hasta dos decimales es NaN.
 */
export function parseAmount(text: string): number | null {
  return parseDecimal(text, 2);
}

/** Como `parseAmount`, con hasta `maxDecimals` decimales (una tasa de cambio lleva hasta 8). */
export function parseDecimal(text: string, maxDecimals: number): number | null {
  const pattern = new RegExp(`^\\d+(,\\d{1,${maxDecimals}})?$`);
  const clean = text.replace(/\b[A-Z]{3}\b/g, '').replace(/[\s$€]/g, '');
  if (clean === '') return null;
  // Los puntos de miles van cada tres cifras; si no, el número está mal escrito.
  const [whole = '', ...rest] = clean.split(',');
  if (rest.length > 1) return Number.NaN;
  if (whole.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(whole)) return Number.NaN;
  const normalized = `${whole.replaceAll('.', '')}${rest.length ? `,${rest[0]}` : ''}`;
  if (!pattern.test(normalized)) return Number.NaN;
  const value = Number(normalized.replace(',', '.'));
  return value <= MAX_AMOUNT ? value : Number.NaN;
}

/** Un importe guardado, para volver a mostrarlo en un campo con el mismo formato que se escribe. */
export function amountToText(value: number | null, locale: string, maxDecimals = 2): string {
  if (value === null) return '';
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(value);
}
