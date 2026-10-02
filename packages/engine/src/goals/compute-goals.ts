import type { IsoDate, Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';
import { datedifMonths } from '../excel';
import { tripCost, type TripCostInput } from './trip-cost';

/** Una meta del cliente (RN-100). */
export interface GoalInput {
  /** Valor de la meta; no se usa si la meta usa la calculadora de viaje. @excel Metas!D6:D10 */
  readonly amount: Money | null;
  /** Calculadora de viaje de la meta; null si no la usa. @excel Metas!E6:E10 */
  readonly trip: TripCostInput | null;
  /** @excel Metas!G6:G10 */
  readonly alreadySaved: Money | null;
  /** Años entre repeticiones (un viaje cada 2 años); null si la meta no se repite. @excel Metas!H6:H10 */
  readonly repeatEveryYears: number | null;
  /** @excel Metas!I6:I10 */
  readonly targetDate: IsoDate | null;
  /** Bolsillo donde se guarda su aporte (`PocketInput.key`); null si no tiene. @excel Metas!C6:C10 */
  readonly pocket: string | null;
}

export interface GoalResult {
  /** Valor de la meta en moneda base. @excel Metas!F6:F10 */
  readonly usedAmount: number;
  /** Meses hasta la fecha objetivo, al menos 1; null sin fecha. @excel Metas!J6:J10 */
  readonly monthsRemaining: number | null;
  /** Aporte mensual al bolsillo de la meta. @excel Metas!K6:K10 */
  readonly monthlyContribution: number;
}

export interface GoalsResult {
  readonly rows: readonly GoalResult[];
  /** @excel Metas!K11 */
  readonly monthlyTotal: number;
}

/**
 * Valor, meses restantes y aporte mensual de cada meta (RN-100). Una meta que se repite reparte su
 * valor en los meses del ciclo y no descuenta lo ya ahorrado; una meta con fecha reparte lo que
 * falta entre los meses que quedan (al menos 1, también si la fecha ya pasó). Sin fecha ni
 * repetición, el aporte es 0.
 */
export function computeGoals(
  goals: readonly GoalInput[],
  cutoffDate: IsoDate,
  fx: FxContext,
): GoalsResult {
  const rows = goals.map((goal): GoalResult => {
    const usedAmount = goal.trip
      ? tripCost(goal.trip, fx).total
      : goal.amount
        ? toBaseCompat(goal.amount, fx)
        : 0;
    const monthsRemaining =
      goal.targetDate === null
        ? null
        : Math.max(1, datedifMonths(cutoffDate, goal.targetDate) ?? 1);
    const repeatEveryYears = goal.repeatEveryYears ?? 0;
    let monthlyContribution = 0;
    if (repeatEveryYears > 0) {
      monthlyContribution = usedAmount / (repeatEveryYears * 12);
    } else if (monthsRemaining !== null) {
      const saved = goal.alreadySaved ? toBaseCompat(goal.alreadySaved, fx) : 0;
      monthlyContribution = Math.max(0, (usedAmount - saved) / monthsRemaining);
    }
    return { usedAmount, monthsRemaining, monthlyContribution };
  });
  let monthlyTotal = 0;
  for (const row of rows) monthlyTotal += row.monthlyContribution;
  return { rows, monthlyTotal };
}
