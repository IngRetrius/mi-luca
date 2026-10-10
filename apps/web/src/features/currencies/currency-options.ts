/** Una moneda del menú de P-A19: su código y su nombre en el idioma de la interfaz. */
export interface CurrencyOption {
  readonly code: string;
  readonly name: string;
}

/**
 * Las monedas comunes (`currencies.common`, en su orden) que todavía se pueden agregar: sin la
 * moneda base ni las que ya tienen tasa. El nombre lo da el navegador (`Intl.DisplayNames`).
 */
export function currencyOptions(
  common: readonly string[],
  { base, existing, locale }: { base: string; existing: readonly string[]; locale: string },
): CurrencyOption[] {
  const names = new Intl.DisplayNames([locale], { type: 'currency', fallback: 'code' });
  return common
    .filter((code) => code !== base && !existing.includes(code))
    .map((code) => ({ code, name: names.of(code) ?? code }));
}
