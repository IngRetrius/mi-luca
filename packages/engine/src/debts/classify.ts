import type { DebtMethod } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import type { DebtInput } from './debt-totals';

export interface DebtClassification {
  /** Tasa mensual equivalente a la efectiva anual; null sin tasa. @excel Deudas!I13:I20 */
  readonly monthlyRate: readonly (number | null)[];
  /** Lugar de cada deuda en el orden de pago (1 es la primera); null sin saldo. @excel Deudas!K13:K20 */
  readonly order: readonly (number | null)[];
  /** Índice de la deuda en cada lugar del orden: `byOrder[0]` es la primera en recibir abonos. */
  readonly byOrder: readonly number[];
}

/** Tasa mensual equivalente: (1 + EA)^(1/12) - 1. @excel Deudas!I13 */
export function monthlyRate(annualRate: number): number {
  return (1 + annualRate) ** (1 / 12) - 1;
}

/**
 * Orden de pago de las deudas con saldo (RN-091). Avalancha: mayor tasa primero; bola de nieve:
 * menor saldo primero; en un empate va primero la que está antes en la lista, como la fila en la
 * plantilla. Una tasa sin escribir vale 0. El orden manual usa el lugar que fijó el asesor (las
 * deudas sin lugar van al final, en el orden de la lista); la plantilla no lo tiene.
 *
 * @excel Deudas!K13:K20
 */
export function classifyDebts(
  debts: readonly DebtInput[],
  method: DebtMethod,
  fx: FxContext,
  /** Saldo desde el que una deuda entra al orden: 0 en la hoja Deudas, 0,5 en la de créditos. */
  minBalance = 0,
): DebtClassification {
  const balances = debts.map((debt) => toBaseCompat(debt.balance, fx));
  const rates = debts.map((debt) => debt.annualRate ?? 0);
  const withBalance = debts
    .map((_, index) => index)
    .filter((index) => balances[index]! > minBalance);

  const before = (a: number, b: number): number => {
    if (method === 'manual') {
      const orderA = debts[a]!.manualOrder ?? Number.POSITIVE_INFINITY;
      const orderB = debts[b]!.manualOrder ?? Number.POSITIVE_INFINITY;
      if (orderA !== orderB) return orderA - orderB;
    } else if (method === 'bola_de_nieve') {
      if (balances[a] !== balances[b]) return balances[a]! - balances[b]!;
    } else if (rates[a] !== rates[b]) {
      return rates[b]! - rates[a]!;
    }
    return a - b;
  };
  const byOrder = [...withBalance].sort(before);

  const order: (number | null)[] = debts.map(() => null);
  byOrder.forEach((index, position) => {
    order[index] = position + 1;
  });
  return {
    monthlyRate: debts.map((debt) =>
      debt.annualRate === null ? null : monthlyRate(debt.annualRate),
    ),
    order,
    byOrder,
  };
}
