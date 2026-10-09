import type { IsoDate, Money } from '@miluca/domain';

import type { CreditInput, InstallmentMark } from '../credits';
import { toBaseCompat, type FxContext } from '../currency';

/** Una deuda del inventario, con lo que necesitan los totales, el orden y la simulación. */
export interface DebtInput {
  /** @excel Deudas!D13:D20 */
  readonly balance: Money;
  /** Cuota mínima mensual; null si aún no se escribe. @excel Deudas!F13:F20 */
  readonly minPayment: Money | null;
  /** Tasa efectiva anual (0,28 es 28 %); null si aún no se escribe. @excel Deudas!E13:E20 */
  readonly annualRate: number | null;
  /** Si recibe abonos extra (RN-092); "No" en créditos con FRECH, préstamos familiares, etc. @excel Deudas!G13:G20 */
  readonly acceptsExtra: boolean;
  /** Desde qué fecha recibe abonos extra; null es desde el primer mes. @excel Deudas!H13:H20 */
  readonly extraFrom: IsoDate | null;
  /** Lugar en el orden manual (1 es la primera); solo cuenta con el método manual. */
  readonly manualOrder: number | null;
  /**
   * Seguros y cargos incluidos en la cuota, al mes (RN-096): en la simulación se suman a lo que se
   * debe cada mes, no amortizan capital. La hoja Deudas no los tiene (H-05). @excel 'Plan de pago'!G12
   */
  readonly insurance?: Money | null;
  /**
   * Seguimiento cuota a cuota (plantilla de créditos). Con él, el saldo, la cuota mínima y la fecha
   * de los abonos del diagnóstico salen de la tabla del crédito (`creditBridge`); importes en la
   * moneda de la deuda.
   */
  readonly tracking?: { readonly credit: CreditInput; readonly marks: readonly InstallmentMark[] };
  /**
   * Tiene cuotas atrasadas o un reporte negativo (protocolo 8.3, paso 10; pregunta 15). No cambia
   * el cálculo: pide al asesor explicar el acuerdo de pago antes de entregar (ADR 0027).
   */
  readonly inArrears?: boolean;
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
