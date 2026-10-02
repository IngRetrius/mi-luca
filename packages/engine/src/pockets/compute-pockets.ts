import type { Money } from '@miluca/domain';

import type { BudgetItemInput, BudgetResult } from '../budget';
import { toBaseCompat, type FxContext } from '../currency';

/** Un bolsillo general (los de fondo de emergencia y meses sin ingreso los arma el motor). */
export interface PocketInput {
  /** Con esta llave lo nombran las partidas del presupuesto (`BudgetItemInput.pocket`). */
  readonly key: string;
  /** Saldo que el asesor le asigna hoy; null es 0. @excel Bolsillos!G8:G17 */
  readonly initialBalance: Money | null;
}

export interface PocketsInput {
  /** Bolsillos generales, en orden. */
  readonly pockets: readonly PocketInput[];
  /** Partidas con que se calculó el presupuesto, en el orden de `budget.rows`. */
  readonly budgetItems: readonly BudgetItemInput[];
  readonly budget: BudgetResult;
  /** @excel Fondo emergencia!C21 */
  readonly emergencyCurrentGoal: number;
  /** Faltante de los meses en rojo. @excel Flujo anual!T20 */
  readonly noIncomeShortfall: number;
  /** Aporte igual por mes positivo. @excel Flujo anual!T23 */
  readonly noIncomeContribution: number;
  /** @excel Patrimonio!C33 */
  readonly liquidAssets: number;
  /** Dinero que se queda en la cuenta operativa, en moneda base. @excel Supuestos!C32 */
  readonly operatingCushion: number;
  /** @excel Deudas!C23 */
  readonly hasExpensiveDebt: boolean;
  /** Parte del excedente que va a la deuda cara. @excel Supuestos!C25 */
  readonly pctToDebt: number;
  /** Parte del excedente que va a inversión sin deuda cara. @excel Supuestos!C26 */
  readonly pctExcessToInvestment: number;
}

export interface PocketRow {
  /** @excel Bolsillos!D6:D17 */
  readonly annualGoal: number;
  /** @excel Bolsillos!E6:E17 */
  readonly monthlyContribution: number;
  /** Saldo de hoy: sugerido en los dos primeros, escrito en los generales. @excel Bolsillos!G6:G17 */
  readonly balance: number;
}

export interface PocketsResult {
  /** Meta vigente; el aporte la completa en 12 meses. @excel Bolsillos!6 */
  readonly emergency: PocketRow;
  /** Faltante de los meses en rojo y su aporte en los meses positivos. @excel Bolsillos!7 */
  readonly noIncome: PocketRow;
  /** Lo que el presupuesto asigna a cada bolsillo general, en el orden de entrada. @excel Bolsillos!8:17 */
  readonly general: readonly PocketRow[];
  /** @excel Bolsillos!D18:G18 */
  readonly total: PocketRow;
  /** @excel Bolsillos!C21 */
  readonly liquidAssets: number;
  /** @excel Bolsillos!C22 */
  readonly operatingCushion: number;
  /** @excel Bolsillos!C23 */
  readonly available: number;
  /** @excel Bolsillos!C24 */
  readonly assigned: number;
  /** Negativo si los saldos superan lo disponible. @excel Bolsillos!C25 */
  readonly excess: number;
  /** @excel Bolsillos!C26 */
  readonly lumpSumToDebt: number;
  /** @excel Bolsillos!C27 */
  readonly lumpSumToInvestment: number;
  /** @excel Bolsillos!C28 */
  readonly unallocated: number;
  /** Bolsillos con aporte mensual, para comparar con el límite del banco (RN-073). @excel Bolsillos!C29 */
  readonly withContribution: number;
  /** Los saldos superan lo disponible (con medio peso de margen). @excel Bolsillos!C30 */
  readonly overAllocated: boolean;
}

/**
 * Bolsillos y reparto del saldo actual (RN-070 a RN-074). El saldo líquido, menos el colchón de la
 * cuenta operativa, va primero al fondo de emergencia, luego a meses sin ingreso y luego a los
 * saldos escritos en cada bolsillo general. Del excedente, una parte va a la deuda cara o, sin
 * ella, a inversión.
 *
 * La meta y el aporte de un bolsillo general son lo que el presupuesto le asigna, sin mirar el
 * tipo de la partida, como `SUMIFS` sobre la columna Bolsillo de la plantilla.
 */
export function computePockets(input: PocketsInput, fx: FxContext): PocketsResult {
  const available = Math.max(0, input.liquidAssets - input.operatingCushion);

  const emergencyGoal = input.emergencyCurrentGoal;
  const emergencyBalance = Math.min(emergencyGoal, available);
  const emergency: PocketRow = {
    annualGoal: emergencyGoal,
    monthlyContribution: Math.max(0, emergencyGoal - emergencyBalance) / 12,
    balance: emergencyBalance,
  };
  const noIncome: PocketRow = {
    annualGoal: input.noIncomeShortfall,
    monthlyContribution: input.noIncomeContribution,
    balance: Math.min(input.noIncomeShortfall, Math.max(0, available - emergencyBalance)),
  };

  const general = input.pockets.map((pocket): PocketRow => {
    let annualGoal = 0;
    let monthlyContribution = 0;
    input.budgetItems.forEach((item, index) => {
      if (item.pocket !== pocket.key) return;
      annualGoal += input.budget.rows[index]?.annual ?? 0;
      monthlyContribution += input.budget.rows[index]?.monthlyAverage ?? 0;
    });
    const balance = pocket.initialBalance ? toBaseCompat(pocket.initialBalance, fx) : 0;
    return { annualGoal, monthlyContribution, balance };
  });

  const rows = [emergency, noIncome, ...general];
  const total: PocketRow = {
    annualGoal: rows.reduce((sum, row) => sum + row.annualGoal, 0),
    monthlyContribution: rows.reduce((sum, row) => sum + row.monthlyContribution, 0),
    balance: rows.reduce((sum, row) => sum + row.balance, 0),
  };

  const assigned = total.balance;
  const excess = available - assigned;
  const lumpSumToDebt = input.hasExpensiveDebt ? Math.max(0, excess) * input.pctToDebt : 0;
  const lumpSumToInvestment = input.hasExpensiveDebt
    ? 0
    : Math.max(0, excess) * input.pctExcessToInvestment;

  return {
    emergency,
    noIncome,
    general,
    total,
    liquidAssets: input.liquidAssets,
    operatingCushion: input.operatingCushion,
    available,
    assigned,
    excess,
    lumpSumToDebt,
    lumpSumToInvestment,
    unallocated: excess - lumpSumToDebt - lumpSumToInvestment,
    withContribution: rows.filter((row) => row.monthlyContribution > 0).length,
    overAllocated: excess < -0.5,
  };
}
