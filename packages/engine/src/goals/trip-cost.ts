import type { CurrencyCode } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/** Un concepto del viaje en su moneda: valor unitario por cantidad (noches, días, unidades). */
export interface TripCostItem {
  readonly unitValue: number;
  readonly quantity: number;
  /** Alojamiento: sobre su total se cobran los impuestos del alojamiento. */
  readonly isLodging: boolean;
}

/** Calculadora de viaje en otra moneda (RN-101). */
export interface TripCostInput {
  /** Moneda de los conceptos; la plantilla solo admite USD. */
  readonly currency: CurrencyCode;
  readonly items: readonly TripCostItem[];
  /** Impuestos del alojamiento, como fracción (0,19 es 19 %). @excel Metas!C17 */
  readonly lodgingTaxRate: number;
  /** Colchón por tasa de cambio y comisiones; 0,05 por defecto. @excel Metas!C24 */
  readonly cushionRate: number;
  /** Gastos que ya están en moneda base (trayecto al aeropuerto, visa). @excel Metas!E28:E29 */
  readonly baseCurrencyCosts: readonly number[];
}

export interface TripCostResult {
  /** @excel Metas!E17 */
  readonly lodgingTax: number;
  /** Conceptos más impuestos del alojamiento, en la moneda del viaje. @excel Metas!E23 */
  readonly subtotal: number;
  /** @excel Metas!E24 */
  readonly cushion: number;
  /** @excel Metas!E25 */
  readonly totalForeign: number;
  /** Total en moneda extranjera llevado a la moneda base; sin tasa vale 0. @excel Metas!E27 */
  readonly totalForeignInBase: number;
  /** Lo que cuesta el viaje en moneda base: es el valor de la meta. @excel Metas!E30 */
  readonly total: number;
}

/** Costo del viaje en moneda base, con impuestos del alojamiento y colchón cambiario. */
export function tripCost(input: TripCostInput, fx: FxContext): TripCostResult {
  let items = 0;
  let lodging = 0;
  for (const item of input.items) {
    const amount = item.unitValue * item.quantity;
    items += amount;
    if (item.isLodging) lodging += amount;
  }
  const lodgingTax = lodging * input.lodgingTaxRate;
  const subtotal = items + lodgingTax;
  const cushion = subtotal * input.cushionRate;
  const totalForeign = subtotal + cushion;
  const totalForeignInBase = toBaseCompat({ amount: totalForeign, currency: input.currency }, fx);
  let total = totalForeignInBase;
  for (const cost of input.baseCurrencyCosts) total += cost;
  return { lodgingTax, subtotal, cushion, totalForeign, totalForeignInBase, total };
}
