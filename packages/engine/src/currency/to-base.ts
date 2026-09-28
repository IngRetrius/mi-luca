import type { CurrencyCode, FxRates, Money } from '@miluca/domain';

/** Moneda base del cliente y sus tasas (RN-017). */
export interface FxContext {
  readonly baseCurrency: CurrencyCode;
  readonly ratesToBase: Readonly<FxRates>;
}

/**
 * Convierte un importe a la moneda base con la tasa del cliente (RN-010).
 * Devuelve `undefined` si falta la tasa, para que quien llama lo registre como pendiente.
 */
export function toBase(money: Money, fx: FxContext): number | undefined {
  if (money.currency === fx.baseCurrency) {
    return money.amount;
  }
  const rate = fx.ratesToBase[money.currency];
  return rate === undefined ? undefined : money.amount * rate;
}

/**
 * Conversión con la semántica exacta de la plantilla (modo compatible):
 * `IF(N(E)=0, 0, IF(D="USD", E*N(tasa), E))`. Sin tasa, el importe vale 0.
 *
 * @excel Ingresos!F6:F13, Inversión!F6:F11, Patrimonio!F8:F27
 */
export function toBaseCompat(money: Money, fx: FxContext): number {
  if (money.amount === 0) {
    return 0;
  }
  return toBase(money, fx) ?? 0;
}

/** Monedas usadas sin tasa registrada, sin repetir y en el orden en que aparecen. */
export function missingRates(monies: Iterable<Money>, fx: FxContext): CurrencyCode[] {
  const missing = new Set<CurrencyCode>();
  for (const money of monies) {
    if (money.currency !== fx.baseCurrency && fx.ratesToBase[money.currency] === undefined) {
      missing.add(money.currency);
    }
  }
  return [...missing];
}
