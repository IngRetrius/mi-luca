import type { IsoDate } from '@miluca/domain';

import type { FxContext } from '../currency';
import type { DebtClassification } from './classify';
import type { DebtInput } from './debt-totals';
import {
  expensiveDebtPayoff,
  simulateDebts,
  type DebtPlanInput,
  type DebtSimulation,
  type ExpensiveDebtPayoff,
} from './simulate';

/** Lo que se agrega al plan en la simulación "¿Y si pagas más?", en moneda base. */
export interface DebtExtraPayment {
  /** Además del extra del sobrante, todos los meses. */
  readonly monthly: number;
  /** Además del abono único del plan, antes del primer mes. */
  readonly lumpSum: number;
}

/** Comparación de una deuda entre el plan y el plan con el pago adicional. */
export interface DebtWhatIfRow {
  readonly debtIndex: number;
  readonly order: number;
  readonly basePayoffDate: IsoDate | null;
  readonly payoffDate: IsoDate | null;
  readonly exceedsHorizon: boolean;
  /** Meses que se adelanta la salida; null si en el plan pasa del horizonte (no se sabe cuántos). */
  readonly monthsSaved: number | null;
  readonly interestSaved: number;
}

/** Cuándo terminan todas las deudas; null si alguna pasa del horizonte. */
export interface DebtFreedom {
  readonly date: IsoDate | null;
  readonly exceedsHorizon: boolean;
}

export interface DebtWhatIf {
  readonly base: DebtSimulation;
  readonly scenario: DebtSimulation;
  /** Solo las deudas que están en el orden de pago, en ese orden. */
  readonly rows: readonly DebtWhatIfRow[];
  readonly baseFreedom: DebtFreedom;
  readonly freedom: DebtFreedom;
  /** Meses que se adelanta la salida de todas; null si en el plan alguna pasa del horizonte. */
  readonly monthsSaved: number | null;
  readonly interestSaved: number;
  /**
   * Si en el plan alguna deuda pasa del horizonte, sus intereses solo cuentan hasta el último mes
   * simulado: el ahorro real es al menos el que se muestra.
   */
  readonly interestSavedIsMinimum: boolean;
  readonly expensivePayoff: ExpensiveDebtPayoff | null;
}

function freedom(simulation: DebtSimulation): DebtFreedom {
  const inPlan = simulation.debts.filter((debt) => debt.order !== null);
  if (inPlan.some((debt) => debt.exceedsHorizon)) return { date: null, exceedsHorizon: true };
  const dates = inPlan.flatMap((debt) => (debt.payoffDate ? [debt.payoffDate] : []));
  return {
    date: dates.length === 0 ? null : dates.reduce((a, b) => (b > a ? b : a)),
    exceedsHorizon: false,
  };
}

/** Meses entre dos primeros de mes ("AAAA-MM-01"). */
function monthsBetween(from: IsoDate, to: IsoDate): number {
  const [fromYear, fromMonth] = from.split('-').map(Number) as [number, number];
  const [toYear, toMonth] = to.split('-').map(Number) as [number, number];
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/**
 * "¿Y si pagas más?": el plan de pago con un pago adicional al mes y un abono único adicional,
 * frente al plan sin ellos. El adicional entra por el mismo orden de pago y respeta las deudas que
 * no aceptan abonos o los aceptan desde una fecha (RN-092, RN-093). No cambia ningún resultado del
 * plan: es una simulación aparte, ilustrativa.
 */
export function debtWhatIf(
  debts: readonly DebtInput[],
  classification: DebtClassification,
  plan: DebtPlanInput,
  extra: DebtExtraPayment,
  expensiveRows: readonly (boolean | null)[],
  fx: FxContext,
): DebtWhatIf {
  const base = simulateDebts(debts, classification, plan, fx);
  const scenario = simulateDebts(
    debts,
    classification,
    {
      ...plan,
      extraMonthly: plan.extraMonthly + Math.max(0, extra.monthly),
      lumpSum: plan.lumpSum + Math.max(0, extra.lumpSum),
    },
    fx,
  );

  const rows = classification.byOrder.map((debtIndex) => {
    const before = base.debts[debtIndex]!;
    const after = scenario.debts[debtIndex]!;
    return {
      debtIndex,
      order: before.order!,
      basePayoffDate: before.payoffDate,
      payoffDate: after.payoffDate,
      exceedsHorizon: after.exceedsHorizon,
      monthsSaved:
        before.payoffDate === null || after.payoffDate === null
          ? null
          : monthsBetween(after.payoffDate, before.payoffDate),
      interestSaved: (before.interestWithPlan ?? 0) - (after.interestWithPlan ?? 0),
    };
  });

  const baseFreedom = freedom(base);
  const scenarioFreedom = freedom(scenario);
  return {
    base,
    scenario,
    rows,
    baseFreedom,
    freedom: scenarioFreedom,
    monthsSaved:
      baseFreedom.date === null || scenarioFreedom.date === null
        ? null
        : monthsBetween(scenarioFreedom.date, baseFreedom.date),
    interestSaved: base.interestWithPlan - scenario.interestWithPlan,
    interestSavedIsMinimum: base.anyExceedsHorizon,
    expensivePayoff: expensiveDebtPayoff(expensiveRows, scenario),
  };
}
