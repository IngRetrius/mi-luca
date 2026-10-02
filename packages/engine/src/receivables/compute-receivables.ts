import type { IsoDate, Money, MonthFlags } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import { edate, monthIndex, roundUp } from '../excel';

/** Dinero que le deben al cliente y le pagan por cuotas (RN-060). */
export interface ReceivableInput {
  /** Saldo pendiente al empezar a pagar; null si aún no se escribe. */
  readonly balance: Money | null;
  /** Cuota mensual, en la misma moneda del saldo; null si aún no se escribe. */
  readonly monthlyPayment: Money | null;
  readonly firstPaymentDate: IsoDate | null;
  /** Parte de cada abono que va a inversión, de 0 a 1 (por defecto 1). @excel Supuestos!H46:H48 */
  readonly pctToInvestment: number;
}

export interface ReceivableRowResult {
  /** Null sin saldo o sin cuota. @excel Supuestos!F46:F48 */
  readonly installments: number | null;
  /** @excel Supuestos!G46:G48 */
  readonly lastPaymentDate: IsoDate | null;
  /** Saldo que falta por cobrar en la fecha de corte, en moneda base. @excel Supuestos!I46:I48 */
  readonly pendingAtCutoff: number;
}

/** Abonos que entran cada mes del año del flujo, en moneda base. */
export interface ReceivablePayments {
  /** @excel Flujo anual!E28:P28 */
  readonly received: MonthFlags;
  /** Parte de cada abono marcada para inversión, antes de mirar si hay deuda cara. */
  readonly forInvestment: MonthFlags;
}

export interface ReceivablesResult {
  readonly rows: readonly ReceivableRowResult[];
  /** @excel Supuestos!I49 */
  readonly totalPending: number;
  readonly payments: ReceivablePayments;
}

function months(value: (month: number) => number): MonthFlags {
  return Array.from({ length: 12 }, (_, month) => value(month)) as unknown as MonthFlags;
}

/**
 * Cuentas por cobrar (RN-060 a RN-062): cuotas, último pago, saldo pendiente en la fecha de corte
 * y abonos de cada mes del año del flujo. Los abonos no son ingreso del presupuesto: el flujo los
 * manda a inversión o, con deuda cara, a deudas.
 *
 * Igual que la plantilla, una fila con fecha y cuota pero sin saldo no tiene último mes y sus
 * abonos cuentan todos los meses desde el primero (en Excel, un número siempre es menor que "").
 */
export function computeReceivables(
  receivables: readonly ReceivableInput[],
  cutoffDate: IsoDate,
  flowYear: number,
  fx: FxContext,
): ReceivablesResult {
  const cutoffMonth = monthIndex(cutoffDate);
  const schedules = receivables.map((receivable) => {
    const balance = receivable.balance?.amount ?? 0;
    const payment = receivable.monthlyPayment?.amount ?? 0;
    const installments = balance === 0 || payment === 0 ? null : roundUp(balance / payment, 0);
    const lastPaymentDate =
      installments === null || receivable.firstPaymentDate === null
        ? null
        : edate(receivable.firstPaymentDate, installments - 1);
    const start =
      receivable.firstPaymentDate === null ? null : monthIndex(receivable.firstPaymentDate);
    const end = lastPaymentDate === null ? Number.POSITIVE_INFINITY : monthIndex(lastPaymentDate);

    let pending = balance;
    if (start !== null && installments !== null) {
      const paid = Math.max(0, Math.min(installments, cutoffMonth - start + 1));
      pending = Math.max(0, balance - payment * paid);
    }
    const currency = receivable.balance?.currency ?? receivable.monthlyPayment?.currency;
    const toBase = (amount: number) =>
      currency === undefined ? 0 : toBaseCompat({ amount, currency }, fx);
    return {
      row: { installments, lastPaymentDate, pendingAtCutoff: toBase(pending) },
      start,
      end,
      paymentBase: toBase(payment),
      pctToInvestment: receivable.pctToInvestment,
    };
  });

  const paidIn = (month: number, share: (schedule: (typeof schedules)[number]) => number) => {
    const index = flowYear * 12 + month + 1;
    let total = 0;
    for (const schedule of schedules) {
      if (schedule.start !== null && index >= schedule.start && index <= schedule.end) {
        total += share(schedule);
      }
    }
    return total;
  };

  const rows = schedules.map((schedule) => schedule.row);
  return {
    rows,
    totalPending: rows.reduce((sum, row) => sum + row.pendingAtCutoff, 0),
    payments: {
      received: months((month) => paidIn(month, (s) => s.paymentBase)),
      forInvestment: months((month) => paidIn(month, (s) => s.paymentBase * s.pctToInvestment)),
    },
  };
}
