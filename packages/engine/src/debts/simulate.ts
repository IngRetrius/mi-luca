import type { IsoDate } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import { edate, nper } from '../excel';
import type { DebtClassification } from './classify';
import type { DebtInput } from './debt-totals';

/** Meses de la simulación del diagnóstico (RN-094). El seguimiento de créditos usa 360. */
export const DIAGNOSIS_HORIZON_MONTHS = 120;

// Un saldo de medio peso o menos ya cuenta como pagado. @excel Deudas!E86:E93
const PAID_OFF = 0.5;

export interface DebtPlanInput {
  /** Primer mes de la simulación: el mes siguiente al de corte. @excel Deudas!C11 */
  readonly startMonth: IsoDate;
  /** Pago extra mensual desde el sobrante, en moneda base. @excel Deudas!C8 */
  readonly extraMonthly: number;
  /** Abono único inicial desde el excedente del saldo de hoy, en moneda base. @excel Deudas!C10 */
  readonly lumpSum: number;
  readonly horizonMonths: number;
}

/** Una fila de la simulación mes a mes: la deuda que ocupa un lugar del orden de pago. */
export interface DebtScheduleRow {
  /** Índice de la deuda en la lista. */
  readonly debtIndex: number;
  /** Saldo inicial después del abono único. @excel Deudas!D37 */
  readonly initialBalance: number;
  /** Saldo del mes anterior con el interés del mes. @excel Deudas!E34:DT34 */
  readonly owed: readonly number[];
  /** @excel Deudas!E35:DT35 */
  readonly minimum: readonly number[];
  /** @excel Deudas!E36:DT36 */
  readonly extra: readonly number[];
  /** @excel Deudas!E37:DT37 */
  readonly balance: readonly number[];
  /**
   * Mes en que queda saldada, contado desde el primero (1); 0 si la salda el abono único; null si
   * sigue debiendo al final del horizonte ("Más de 120"). @excel Deudas!E86:E93
   */
  readonly monthsToPayoff: number | null;
  /** Lo pagado de más sobre el saldo inicial. @excel Deudas!F86:F93 */
  readonly interest: number;
}

/** Resultado de cada deuda de la lista, en el orden de la lista. */
export interface SimulatedDebt {
  /** @excel Deudas!K13:K20 */
  readonly order: number | null;
  /** null sin saldo o si pasa del horizonte (ver `exceedsHorizon`). @excel Deudas!L13:L20 */
  readonly monthsToPayoff: number | null;
  /** "Más de 120": el pago total no alcanza a saldarla dentro del horizonte. */
  readonly exceedsHorizon: boolean;
  /** Mes en que queda saldada; null sin saldo o si pasa del horizonte. @excel Deudas!M13:M20 */
  readonly payoffDate: IsoDate | null;
  /** null sin saldo. @excel Deudas!N13:N20 */
  readonly interestWithPlan: number | null;
  /**
   * Intereses si solo se pagara la cuota (aproximado); null sin saldo o si la cuota no cubre el
   * interés ("No se paga", ver `neverPaidWithMinimum`). @excel Deudas!O13:O20
   */
  readonly interestMinimumOnly: number | null;
  readonly neverPaidWithMinimum: boolean;
}

export interface DebtSimulation {
  readonly startMonth: IsoDate;
  /** Cuotas mínimas más el extra: se mantiene aunque una deuda termine (RN-093). @excel Deudas!C9 */
  readonly totalPayment: number;
  /** @excel Deudas!E29:DT29 */
  readonly months: readonly IsoDate[];
  /** Lo que queda del pago total después de las cuotas mínimas. @excel Deudas!E31:DT31 */
  readonly availableForExtra: readonly number[];
  /** Una fila por lugar del orden de pago. @excel Deudas!B33:DT80 */
  readonly byOrder: readonly DebtScheduleRow[];
  readonly debts: readonly SimulatedDebt[];
  /** @excel Deudas!N21 */
  readonly interestWithPlan: number;
  /** Suma de las deudas que se pagan solo con la cuota. @excel Deudas!O21 */
  readonly interestMinimumOnly: number;
  /** Ahorro en intereses con el plan; null si alguna no se paga o pasa del horizonte ("Ver detalle"). @excel Deudas!H22 */
  readonly interestSavings: number | null;
  /** @excel Deudas!C26 */
  readonly anyExceedsHorizon: boolean;
}

/**
 * Simulación mes a mes del plan de pago (RN-092, RN-093). Cada mes, cada deuda paga su cuota
 * mínima (o lo que deba, si es menos); lo que queda del pago total va en el orden de pago como
 * abono extra a las deudas que lo aceptan desde ese mes. Cuando una deuda termina, su cuota se
 * libera para las siguientes. Antes del primer mes, el abono único va en el mismo orden a las
 * deudas que ya aceptan abonos.
 *
 * Los meses para pagar cuentan los meses con saldo de más de medio peso, más uno. En Excel con coma
 * decimal (Colombia, España) la plantilla da siempre 1 por el criterio `">0.5"`; el motor da el
 * valor que da Excel con punto decimal (H-28, ADR 0013).
 *
 * @excel Deudas!C8:C11, E29:DT80, B86:F93, L13:O20, N21:O21, H22, C26
 */
export function simulateDebts(
  debts: readonly DebtInput[],
  classification: DebtClassification,
  plan: DebtPlanInput,
  fx: FxContext,
): DebtSimulation {
  const horizon = plan.horizonMonths;
  const balances = debts.map((debt) => toBaseCompat(debt.balance, fx));
  const minimums = debts.map((debt) => (debt.minPayment ? toBaseCompat(debt.minPayment, fx) : 0));
  // Las cuotas de las deudas sin saldo también suman al pago total, como en la plantilla.
  const totalPayment = minimums.reduce((sum, value) => sum + value, 0) + plan.extraMonthly;
  const months = Array.from({ length: horizon }, (_, month) => edate(plan.startMonth, month));

  const startsWithExtra = (debt: DebtInput): boolean =>
    debt.acceptsExtra && (debt.extraFrom === null || debt.extraFrom <= plan.startMonth);
  let lumpSumUsed = 0;
  const rows = classification.byOrder.map((debtIndex) => {
    const debt = debts[debtIndex]!;
    const balance = balances[debtIndex]!;
    if (!startsWithExtra(debt)) return { debtIndex, debt, initialBalance: balance };
    // Lo que queda del abono único después de las deudas anteriores que lo recibieron. @excel Deudas!D37
    const initialBalance = Math.max(0, balance - Math.max(0, plan.lumpSum - lumpSumUsed));
    lumpSumUsed += balance;
    return { debtIndex, debt, initialBalance };
  });

  const owed = rows.map(() => new Array<number>(horizon));
  const minimum = rows.map(() => new Array<number>(horizon));
  const extra = rows.map(() => new Array<number>(horizon));
  const balance = rows.map(() => new Array<number>(horizon));
  const availableForExtra = new Array<number>(horizon);
  const rates = rows.map(({ debtIndex }) => classification.monthlyRate[debtIndex] ?? 0);

  for (let month = 0; month < horizon; month++) {
    let minimumsPaid = 0;
    rows.forEach((row, slot) => {
      const previous = month === 0 ? row.initialBalance : balance[slot]![month - 1]!;
      owed[slot]![month] = previous * (1 + rates[slot]!);
      minimum[slot]![month] = Math.min(minimums[row.debtIndex]!, owed[slot]![month]!);
      minimumsPaid += minimum[slot]![month]!;
    });
    availableForExtra[month] = totalPayment - minimumsPaid;
    let extraPaid = 0;
    rows.forEach((row, slot) => {
      const accepts =
        row.debt.acceptsExtra &&
        (row.debt.extraFrom === null || months[month]! >= row.debt.extraFrom);
      const due = owed[slot]![month]! - minimum[slot]![month]!;
      const paid = accepts ? Math.max(0, Math.min(due, availableForExtra[month]! - extraPaid)) : 0;
      extra[slot]![month] = paid;
      extraPaid += paid;
      balance[slot]![month] = due - paid;
    });
  }

  const byOrder: DebtScheduleRow[] = rows.map((row, slot) => {
    const rowBalance = balance[slot]!;
    const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);
    const exceeds = row.initialBalance !== 0 && rowBalance[horizon - 1]! > PAID_OFF;
    return {
      debtIndex: row.debtIndex,
      initialBalance: row.initialBalance,
      owed: owed[slot]!,
      minimum: minimum[slot]!,
      extra: extra[slot]!,
      balance: rowBalance,
      monthsToPayoff:
        row.initialBalance === 0
          ? 0
          : exceeds
            ? null
            : rowBalance.filter((value) => value > PAID_OFF).length + 1,
      interest:
        row.initialBalance === 0
          ? 0
          : sum(minimum[slot]!) + sum(extra[slot]!) + rowBalance[horizon - 1]! - row.initialBalance,
    };
  });

  const simulated: SimulatedDebt[] = debts.map((debt, index) => {
    const order = classification.order[index] ?? null;
    if (order === null) {
      return {
        order,
        monthsToPayoff: null,
        exceedsHorizon: false,
        payoffDate: null,
        interestWithPlan: null,
        interestMinimumOnly: null,
        neverPaidWithMinimum: false,
      };
    }
    const row = byOrder[order - 1]!;
    const minimumOnly = interestMinimumOnly(
      balances[index]!,
      minimums[index]!,
      classification.monthlyRate[index] ?? null,
    );
    return {
      order,
      monthsToPayoff: row.monthsToPayoff,
      exceedsHorizon: row.monthsToPayoff === null,
      payoffDate:
        row.monthsToPayoff === null
          ? null
          : row.monthsToPayoff === 0
            ? plan.startMonth
            : edate(plan.startMonth, row.monthsToPayoff - 1),
      interestWithPlan: row.interest,
      interestMinimumOnly: minimumOnly,
      neverPaidWithMinimum: minimumOnly === null,
    };
  });

  const interestWithPlan = simulated.reduce((sum, debt) => sum + (debt.interestWithPlan ?? 0), 0);
  const interestMinimum = simulated.reduce((sum, debt) => sum + (debt.interestMinimumOnly ?? 0), 0);
  const anyExceedsHorizon = simulated.some((debt) => debt.exceedsHorizon);
  const anyNeverPaid = simulated.some((debt) => debt.neverPaidWithMinimum);
  return {
    startMonth: plan.startMonth,
    totalPayment,
    months,
    availableForExtra,
    byOrder,
    debts: simulated,
    interestWithPlan,
    interestMinimumOnly: interestMinimum,
    interestSavings: anyNeverPaid || anyExceedsHorizon ? null : interestMinimum - interestWithPlan,
    anyExceedsHorizon,
  };
}

/**
 * Intereses aproximados si nunca se hicieran abonos: cuota por número de cuotas (fraccionario)
 * menos el saldo. null si la cuota no cubre el interés del mes ("No se paga").
 *
 * @excel Deudas!O13
 */
function interestMinimumOnly(balance: number, payment: number, rate: number | null): number | null {
  if (rate === null || rate === 0) return 0;
  if (payment <= balance * rate) return null;
  const installments = nper(rate, -payment, balance);
  return installments === null ? null : payment * installments - balance;
}

/** El primer día del mes siguiente al de corte. @excel Deudas!C11 */
export function debtPlanStart(cutoffDate: IsoDate): IsoDate {
  return edate(`${cutoffDate.slice(0, 7)}-01`, 1);
}

export interface ExpensiveDebtPayoff {
  /** Mes en que queda saldada la última deuda cara; null si alguna pasa del horizonte. */
  readonly date: IsoDate | null;
  /** "Más de 120 meses". */
  readonly exceedsHorizon: boolean;
}

/**
 * Salida de la deuda cara: el mes en que termina la última deuda cara; null si no hay deuda cara.
 *
 * @excel Deudas!C25, Resumen!C19
 */
export function expensiveDebtPayoff(
  expensiveRows: readonly (boolean | null)[],
  simulation: DebtSimulation,
): ExpensiveDebtPayoff | null {
  const expensive = simulation.debts.filter((_, index) => expensiveRows[index] === true);
  if (expensive.length === 0) return null;
  if (expensive.some((debt) => debt.exceedsHorizon)) return { date: null, exceedsHorizon: true };
  const dates = expensive.flatMap((debt) => (debt.payoffDate ? [debt.payoffDate] : []));
  return { date: dates.reduce((a, b) => (b > a ? b : a)), exceedsHorizon: false };
}
