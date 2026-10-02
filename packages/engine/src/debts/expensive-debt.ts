import { toBaseCompat, type FxContext } from '../currency';
import type { DebtInput } from './debt-totals';

export interface ExpensiveDebt {
  /** Por deuda: null sin saldo; si no, si su tasa llega al umbral. @excel Deudas!J13:J20 */
  readonly rows: readonly (boolean | null)[];
  /** Saldo de las deudas caras, en moneda base. @excel Deudas!C22 */
  readonly balance: number;
  /** Con deuda cara no se invierte: el sobrante va a deudas (RN-090). @excel Deudas!C23 */
  readonly exists: boolean;
}

/**
 * Deuda cara (RN-090): una deuda con saldo cuya tasa efectiva anual llega al umbral del caso. Una
 * tasa sin escribir vale 0, como `N()` en la plantilla.
 */
export function expensiveDebt(
  debts: readonly DebtInput[],
  threshold: number,
  fx: FxContext,
): ExpensiveDebt {
  let balance = 0;
  const rows = debts.map((debt) => {
    const amount = toBaseCompat(debt.balance, fx);
    if (amount <= 0) return null;
    const expensive = (debt.annualRate ?? 0) >= threshold;
    if (expensive) balance += amount;
    return expensive;
  });
  return { rows, balance, exists: balance > 0 };
}

/**
 * Carga de deuda: cuotas mínimas sobre el ingreso mensual promedio. Null sin ingreso.
 *
 * @excel Deudas!C24
 */
export function debtLoad(minPayments: number, monthlyIncome: number): number | null {
  return monthlyIncome === 0 ? null : minPayments / monthlyIncome;
}
