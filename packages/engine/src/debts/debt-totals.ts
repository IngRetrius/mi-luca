import type { Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/**
 * Lo que necesitan los totales y la marca de deuda cara de una deuda del inventario. El orden y la
 * simulación (abonos, plazos) llegan con el resto del módulo en F4.
 */
export interface DebtInput {
  readonly balance: Money;
  /** Cuota mínima mensual; null si aún no se escribe. */
  readonly minPayment: Money | null;
  /** Tasa efectiva anual (0,28 es 28 %); null si aún no se escribe. @excel Deudas!E13:E20 */
  readonly annualRate: number | null;
}

export interface DebtTotals {
  /** @excel Deudas!D21 */
  readonly balance: number;
  /** Suma de las cuotas mínimas: pasa al presupuesto como fila automática. @excel Deudas!F21 */
  readonly minPayment: number;
}

/** Saldo total y cuotas mínimas del inventario de deudas, en moneda base. */
export function debtTotals(debts: readonly DebtInput[], fx: FxContext): DebtTotals {
  let balance = 0;
  let minPayment = 0;
  for (const debt of debts) {
    balance += toBaseCompat(debt.balance, fx);
    if (debt.minPayment) minPayment += toBaseCompat(debt.minPayment, fx);
  }
  return { balance, minPayment };
}
