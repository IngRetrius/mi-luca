import type { IncomeKind, MonthFlags } from '@miluca/domain';

import type { BudgetItemInput, BudgetResult } from '../budget';
import { toBaseCompat, type FxContext } from '../currency';
import type { IncomeInput, IncomesResult } from '../incomes';
import { at, flowRow, monthValues, type FlowRow, type MonthValues } from './months';

export interface MonthlyFlow {
  /** Entradas por tipo; los ingresos sin tipo no entran al flujo. @excel Flujo anual!E7:Q10 */
  readonly incomeByKind: Readonly<Record<IncomeKind, FlowRow>>;
  /** @excel Flujo anual!E11:Q11 */
  readonly totalIn: FlowRow;
  /** Valor por pago de la seguridad social en cada mes en que se paga. @excel Flujo anual!E13:Q13 */
  readonly socialSecurity: FlowRow;
  /** Promedio mensual de los pagos directos. @excel Flujo anual!E14:Q14 */
  readonly direct: FlowRow;
  /** @excel Flujo anual!E15:Q15 */
  readonly pockets: FlowRow;
  /** @excel Flujo anual!E16:Q16 */
  readonly debtPayments: FlowRow;
  /** @excel Flujo anual!E17:Q17 */
  readonly programmedSavings: FlowRow;
  /** @excel Flujo anual!E18:Q18 */
  readonly totalOut: FlowRow;
  /** Entradas menos salidas. @excel Flujo anual!E19:Q19 */
  readonly balance: FlowRow;
}

const KINDS: readonly IncomeKind[] = ['laboral', 'renta', 'pension', 'otro'];

/**
 * Lo que la familia u otros terceros pagan cada mes por el cliente, con las mismas reglas de las
 * salidas del flujo: la seguridad social en sus meses de pago y lo demás en promedio mensual.
 * En modo nativo entra como ingreso tipo "otro", así el sobrante no cambia (ADR 0010).
 */
export function thirdPartyByMonth(
  items: readonly BudgetItemInput[],
  budget: BudgetResult,
  socialSecurityMonths: MonthFlags,
  fx: FxContext,
): MonthValues {
  let perSocialSecurityPayment = 0;
  let monthly = 0;
  items.forEach((item, index) => {
    if (item.payer === 'cliente' || item.expenseType === null) return;
    if (item.expenseType === 'seg_social') {
      perSocialSecurityPayment += item.amount ? toBaseCompat(item.amount, fx) : 0;
    } else {
      monthly += budget.rows[index]?.monthlyAverage ?? 0;
    }
  });
  return monthValues(
    (month) => perSocialSecurityPayment * at(socialSecurityMonths, month) + monthly,
  );
}

/**
 * Entradas y salidas de cada mes del año del flujo (RN-040). Las entradas son los ingresos en sus
 * meses de pago; las salidas, el promedio mensual de cada tipo de gasto, salvo la seguridad social,
 * que sale en los meses en que se paga. Las partidas sin tipo no salen del flujo, como en la
 * plantilla (y quedan en los pendientes del presupuesto).
 *
 * `extraOtherIncome` suma a "otros ingresos": el aporte implícito de terceros del modo nativo.
 * `debtMinimums`, también del modo nativo (H-03, ADR 0015), reemplaza el promedio de la fila
 * automática de cuotas (`Presupuesto!6`) por lo que se paga cada mes según el plan de pago.
 */
export function monthlyFlow(
  incomes: readonly IncomeInput[],
  incomesResult: IncomesResult,
  budget: BudgetResult,
  socialSecurityMonths: MonthFlags,
  extraOtherIncome: MonthValues | null = null,
  debtMinimums: { readonly automaticMonthly: number; readonly months: MonthValues } | null = null,
): MonthlyFlow {
  const incomeByKind = Object.fromEntries(
    KINDS.map((kind) => [
      kind,
      flowRow((month) => {
        let total = kind === 'otro' && extraOtherIncome ? at(extraOtherIncome, month) : 0;
        incomes.forEach((income, index) => {
          if (income.kind === kind) {
            total +=
              (incomesResult.rows[index]?.monthlyBase ?? 0) * at(income.paymentsByMonth, month);
          }
        });
        return total;
      }),
    ]),
  ) as Record<IncomeKind, FlowRow>;
  const totalIn = flowRow((month) =>
    KINDS.reduce((sum, kind) => sum + at(incomeByKind[kind].months, month), 0),
  );

  const socialSecurity = flowRow(
    (month) => budget.socialSecurityPerPayment * at(socialSecurityMonths, month),
  );
  const direct = flowRow(() => budget.direct.monthly);
  const pockets = flowRow(() => budget.pockets.monthly);
  const debtPayments = flowRow((month) =>
    debtMinimums
      ? budget.debtPayments.monthly - debtMinimums.automaticMonthly + at(debtMinimums.months, month)
      : budget.debtPayments.monthly,
  );
  const programmedSavings = flowRow(() => budget.programmedSavings.monthly);
  const totalOut = flowRow(
    (month) =>
      at(socialSecurity.months, month) +
      at(direct.months, month) +
      at(pockets.months, month) +
      at(debtPayments.months, month) +
      at(programmedSavings.months, month),
  );
  const balance = flowRow((month) => at(totalIn.months, month) - at(totalOut.months, month));

  return {
    incomeByKind,
    totalIn,
    socialSecurity,
    direct,
    pockets,
    debtPayments,
    programmedSavings,
    totalOut,
    balance,
  };
}
