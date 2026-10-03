import type { DebtMethod, IsoDate } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import {
  classifyDebts,
  debtPlanStart,
  simulateDebts,
  type DebtClassification,
  type DebtInput,
  type DebtSimulation,
} from '../debts';
import { edate } from '../excel';
import { CREDIT_HORIZON_INSTALLMENTS, type CreditInput, type CreditSchedule } from './schedule';

// Un saldo de medio peso o menos ya cuenta como pagado, como en la plantilla.
const PAID_OFF = 0.5;

/** Un crédito en seguimiento, con su tabla ya calculada, en la moneda del crédito. */
export interface TrackedCredit {
  readonly currency: string;
  readonly credit: CreditInput;
  readonly schedule: CreditSchedule;
  /** Lugar en el orden manual; null va al final. @excel 'Plan de pago'!J12:J19 */
  readonly manualOrder: number | null;
}

/** Cada crédito en el plan, en el orden de la lista. */
export interface CreditPlanRow {
  /** @excel 'Plan de pago'!K12 */
  readonly order: number | null;
  /** Fin pagando solo las cuotas; null si pasa de 360 meses. @excel 'Plan de pago'!L12 */
  readonly endMinimumOnly: IsoDate | null;
  readonly minimumOnlyExceedsHorizon: boolean;
  /** Fin con el plan; null si pasa de 360 meses. @excel 'Plan de pago'!M12 */
  readonly endWithPlan: IsoDate | null;
  readonly withPlanExceedsHorizon: boolean;
  /** Cuántos meses antes termina con el plan; null si alguno pasa del horizonte. @excel 'Plan de pago'!N12 */
  readonly monthsEarlier: number | null;
  /** Intereses y seguros solo con cuotas. @excel 'Plan de pago'!O12 */
  readonly costMinimumOnly: number;
  /** Intereses y seguros con el plan. @excel 'Plan de pago'!P12 */
  readonly costWithPlan: number;
}

export interface CreditsPaymentPlan {
  /** @excel 'Plan de pago'!C7 */
  readonly startMonth: IsoDate;
  /** Cuotas de los créditos abiertos más el extra. @excel 'Plan de pago'!C8 */
  readonly totalPayment: number;
  readonly classification: DebtClassification;
  readonly simulation: DebtSimulation;
  readonly rows: readonly CreditPlanRow[];
  /** @excel 'Plan de pago'!O20 */
  readonly costMinimumOnly: number;
  /** @excel 'Plan de pago'!P20 */
  readonly costWithPlan: number;
  /** @excel 'Plan de pago'!C21 */
  readonly savings: number;
  /** Saldo de cada crédito mes a mes pagando solo las cuotas. @excel 'Plan de pago'!AK28:AR387 */
  readonly minimumOnlyBalances: readonly (readonly number[])[];
  /** Deuda total al final de cada mes con el plan. @excel 'Plan de pago'!AS28:AS387 */
  readonly debtWithPlan: readonly number[];
  /** @excel 'Plan de pago'!AT28:AT387 */
  readonly debtMinimumOnly: readonly number[];
  /** Lo que se paga cada mes con el plan: cuotas y extras. @excel 'Plan de pago'!AU28:AU387 */
  readonly paymentWithPlan: readonly number[];
}

/** Meses entre dos fechas, por año y mes. @excel 'Plan de pago'!N12 */
function monthsBetween(later: IsoDate, earlier: IsoDate): number {
  const [laterYear, laterMonth] = later.split('-').map(Number) as [number, number];
  const [earlierYear, earlierMonth] = earlier.split('-').map(Number) as [number, number];
  return (laterYear - earlierYear) * 12 + laterMonth - earlierMonth;
}

/**
 * Plan de pago de la plantilla de créditos (H-06: el mismo simulador que la hoja Deudas, a 360
 * meses, con los seguros de cada cuota y sin abono único): cada crédito en el orden del método,
 * frente a pagar solo las cuotas. Parte del saldo de hoy de cada tabla y de su cuota usada; el
 * extra mensual lo escribe el asesor. Importes en moneda base.
 *
 * @excel 'Plan de pago'!C7:P21, E22:AU387
 */
export function creditsPaymentPlan(
  credits: readonly TrackedCredit[],
  method: DebtMethod,
  extraMonthly: number,
  cutoffDate: IsoDate,
  fx: FxContext,
): CreditsPaymentPlan {
  const horizon = CREDIT_HORIZON_INSTALLMENTS;
  const debts: DebtInput[] = credits.map(({ currency, credit, schedule, manualOrder }) => ({
    balance: { amount: schedule.currentBalance, currency },
    minPayment: { amount: schedule.payment, currency },
    annualRate: credit.annualRate,
    acceptsExtra: credit.acceptsExtra,
    extraFrom: schedule.extraFromDate,
    manualOrder,
    insurance: { amount: credit.insurance, currency },
  }));
  const startMonth = debtPlanStart(cutoffDate);
  const classification = classifyDebts(debts, method, fx, PAID_OFF);
  const simulation = simulateDebts(
    debts,
    classification,
    { startMonth, extraMonthly, lumpSum: 0, horizonMonths: horizon, variant: 'credits' },
    fx,
  );

  // Solo con cuotas: cada crédito por su lado, sin extras. @excel 'Plan de pago'!AK22:AR387
  const minimumOnly = debts.map((debt, index) => {
    const rate = classification.monthlyRate[index] ?? 0;
    const start = toBaseCompat(debt.balance, fx);
    const payment = debt.minPayment ? toBaseCompat(debt.minPayment, fx) : 0;
    const insurance = debt.insurance ? toBaseCompat(debt.insurance, fx) : 0;
    const balances = new Array<number>(horizon);
    let previous = start;
    for (let month = 0; month < horizon; month++) {
      if (previous > PAID_OFF) {
        const owed = previous * (1 + rate) + insurance;
        balances[month] = owed - Math.min(payment, owed);
      } else {
        balances[month] = 0;
      }
      previous = balances[month]!;
    }
    if (start <= PAID_OFF) return { balances, months: 0 as number | null, cost: 0 };
    const exceeds = balances[horizon - 1]! > PAID_OFF;
    // La plantilla suma los saldos hasta el mes 359 (`AK28:AK386`).
    const early = balances.slice(0, horizon - 1);
    const cost =
      rate * (start + early.reduce((sum, value) => sum + value, 0)) +
      insurance * (1 + early.filter((value) => value > PAID_OFF).length);
    return {
      balances,
      months: exceeds ? null : balances.filter((value) => value > PAID_OFF).length + 1,
      cost,
    };
  });

  const rows: CreditPlanRow[] = debts.map((debt, index) => {
    const order = classification.order[index] ?? null;
    const open = toBaseCompat(debt.balance, fx) > PAID_OFF;
    const only = minimumOnly[index]!;
    const endMinimumOnly =
      !open || only.months === null ? null : edate(startMonth, only.months - 1);
    const planned = order === null ? null : simulation.byOrder[order - 1]!;
    const endWithPlan =
      planned === null || planned.monthsToPayoff === null
        ? null
        : edate(startMonth, planned.monthsToPayoff - 1);
    return {
      order,
      endMinimumOnly,
      minimumOnlyExceedsHorizon: open && only.months === null,
      endWithPlan,
      withPlanExceedsHorizon: planned !== null && planned.monthsToPayoff === null,
      monthsEarlier:
        endMinimumOnly === null || endWithPlan === null
          ? null
          : monthsBetween(endMinimumOnly, endWithPlan),
      costMinimumOnly: open ? only.cost : 0,
      costWithPlan: planned?.interest ?? 0,
    };
  });

  const sumAt = (series: readonly (readonly number[])[], month: number) =>
    series.reduce((sum, values) => sum + (values[month] ?? 0), 0);
  const months = Array.from({ length: horizon }, (_, month) => month);
  const costMinimumOnly = rows.reduce((sum, row) => sum + row.costMinimumOnly, 0);
  const costWithPlan = rows.reduce((sum, row) => sum + row.costWithPlan, 0);
  return {
    startMonth,
    totalPayment: simulation.totalPayment,
    classification,
    simulation,
    rows,
    costMinimumOnly,
    costWithPlan,
    savings: costMinimumOnly - costWithPlan,
    minimumOnlyBalances: minimumOnly.map((only) => only.balances),
    debtWithPlan: months.map((month) =>
      sumAt(
        simulation.byOrder.map((row) => row.balance),
        month,
      ),
    ),
    debtMinimumOnly: months.map((month) =>
      sumAt(
        minimumOnly.map((only) => only.balances),
        month,
      ),
    ),
    paymentWithPlan: months.map(
      (month) =>
        sumAt(
          simulation.byOrder.map((row) => row.minimum),
          month,
        ) +
        sumAt(
          simulation.byOrder.map((row) => row.extra),
          month,
        ),
    ),
  };
}
