import { at, flowRow, type FlowRow, type MonthValues } from './months';

/** Cómo se reparte el aporte al bolsillo de meses sin ingreso (RN-041). */
export type NoIncomeMethod = 'no_aplica' | 'aporte_igual' | 'aporte_proporcional';

export interface NoIncomeMonths {
  /** Suma de los balances negativos, en positivo. @excel Flujo anual!T20 */
  readonly shortfall: number;
  /** @excel Flujo anual!T21 */
  readonly positiveSum: number;
  /** @excel Flujo anual!T22 */
  readonly positiveMonths: number;
  /** Aporte igual por cada mes positivo. @excel Flujo anual!T23 */
  readonly equalContribution: number;
  /** Menor balance positivo; 0 si no hay. @excel Flujo anual!T24 */
  readonly smallestPositive: number;
  /** @excel Flujo anual!T25 */
  readonly method: NoIncomeMethod;
  /** Parte del faltante que los meses positivos alcanzan a cubrir. @excel Flujo anual!T26 */
  readonly coverable: number;
  /** De 0 a 1. @excel Flujo anual!T27 */
  readonly coverage: number;
  /** Lo que se saca del bolsillo en cada mes en rojo. @excel Flujo anual!E20:Q20 */
  readonly use: FlowRow;
  /** Lo que se guarda en el bolsillo en cada mes positivo. @excel Flujo anual!E21:Q21 */
  readonly contribution: FlowRow;
  /** Balance más uso menos aporte. @excel Flujo anual!E22:Q22 */
  readonly surplus: FlowRow;
  /** Los meses positivos no alcanzan a cubrir los meses en rojo (con medio peso de margen). @excel Flujo anual!B36 */
  readonly deficitAlert: boolean;
}

/**
 * Bolsillo de meses sin ingreso (RN-041, RN-042): los meses en rojo se cubren con lo que se guarda
 * en los meses positivos. Si el menor balance positivo alcanza para el aporte igual, se guarda lo
 * mismo cada mes; si no, cada mes aporta en proporción a su balance.
 */
export function noIncomeMonths(balance: MonthValues): NoIncomeMonths {
  let shortfall = 0;
  let positiveSum = 0;
  let positiveMonths = 0;
  let smallestPositive = Number.POSITIVE_INFINITY;
  for (const value of balance) {
    if (value < 0) shortfall -= value;
    if (value > 0) {
      positiveSum += value;
      positiveMonths += 1;
      smallestPositive = Math.min(smallestPositive, value);
    }
  }
  if (positiveMonths === 0) smallestPositive = 0;

  const coverable = Math.min(shortfall, positiveSum);
  const equalContribution = positiveMonths === 0 ? 0 : coverable / positiveMonths;
  const coverage = shortfall === 0 ? 1 : Math.min(1, positiveSum / shortfall);
  const equal = smallestPositive >= equalContribution;
  const method: NoIncomeMethod =
    shortfall === 0 ? 'no_aplica' : equal ? 'aporte_igual' : 'aporte_proporcional';

  const use = flowRow((month) => Math.max(0, -at(balance, month)) * coverage);
  const contribution = flowRow((month) => {
    const value = at(balance, month);
    if (value <= 0) return 0;
    if (equal) return equalContribution;
    return positiveSum === 0 ? 0 : (coverable * value) / positiveSum;
  });
  const surplus = flowRow(
    (month) => at(balance, month) + at(use.months, month) - at(contribution.months, month),
  );

  return {
    shortfall,
    positiveSum,
    positiveMonths,
    equalContribution,
    smallestPositive,
    method,
    coverable,
    coverage,
    use,
    contribution,
    surplus,
    deficitAlert: shortfall > positiveSum + 0.5,
  };
}
