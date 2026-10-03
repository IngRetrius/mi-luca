import type { CurrencyCode, Money } from '@miluca/domain';

import type { CaseInput, CaseResult } from '../compute';
import { missingRates } from '../currency';

/**
 * Qué pasa si un control falla: `blocking` impide entregar; `note` deja entregar solo con una nota
 * que lo explique (por ejemplo, un año que cierra en déficit); `warning` se muestra y la nota es
 * opcional (04-motor, sección 6).
 */
export type QcSeverity = 'blocking' | 'note' | 'warning';

/** Controles que ya se pueden evaluar (F3). Los de inversión, perfil y carta llegan con sus módulos. */
export type QcCode =
  | 'surplus_balances'
  | 'pocket_contributions_match'
  | 'allocation_within_available'
  | 'no_income_covered'
  | 'complete_items'
  | 'items_have_pocket'
  | 'incomes_classified'
  | 'missing_rates'
  | 'no_investment_with_expensive_debt'
  | 'reality_check_done'
  | 'reality_check_confirms'
  | 'third_party_counted_once';

export interface QcItem {
  readonly code: QcCode;
  readonly severity: QcSeverity;
  readonly passed: boolean;
  /** Cifras para explicar el resultado en pantalla (diferencias, conteos, monedas). */
  readonly detail: Readonly<Record<string, number | string | readonly string[]>>;
}

export interface QcReport {
  /** Todos los controles, en el orden de la sección 10 del protocolo. */
  readonly items: readonly QcItem[];
  /** Los que fallaron y bloquean la entrega. */
  readonly blocking: readonly QcItem[];
  /** Los que fallaron y piden una nota para poder entregar. */
  readonly needNote: readonly QcItem[];
  /** Los que fallaron y solo avisan. */
  readonly warnings: readonly QcItem[];
}

/** Diferencia de importes por debajo de la cual dos cifras cuadran (04-motor, 7.1). */
const TOLERANCE = 0.01;

function item(
  code: QcCode,
  severity: QcSeverity,
  passed: boolean,
  detail: QcItem['detail'] = {},
): QcItem {
  return { code, severity, passed, detail };
}

/** Todos los importes del caso, para buscar monedas sin tasa (RN-017). */
function monies(input: CaseInput): Money[] {
  const list: Money[] = [];
  for (const income of input.incomes) list.push(income.monthlyAmount);
  for (const entry of input.budgetItems) {
    if (entry.amount) list.push(entry.amount);
    if (entry.basicAmount) list.push(entry.basicAmount);
  }
  for (const receivable of input.receivables) {
    if (receivable.balance) list.push(receivable.balance);
    if (receivable.monthlyPayment) list.push(receivable.monthlyPayment);
  }
  for (const asset of input.assets) list.push(asset.value);
  for (const pocket of input.pockets) if (pocket.initialBalance) list.push(pocket.initialBalance);
  for (const debt of input.debts) {
    list.push(debt.balance);
    if (debt.minPayment) list.push(debt.minPayment);
  }
  for (const goal of input.goals) {
    if (goal.amount) list.push(goal.amount);
    if (goal.alreadySaved) list.push(goal.alreadySaved);
  }
  for (const insurance of input.insurances) {
    if (insurance.annualPremiumQuoted) list.push(insurance.annualPremiumQuoted);
  }
  list.push(input.parameters.operatingCushion);
  return list;
}

/**
 * Control de calidad antes de entregar un plan (protocolo, sección 10; 04-motor, sección 6): lo
 * que se puede verificar con números. Puro: lee la entrada y el resultado de `compute`.
 */
export function qualityChecks(input: CaseInput, result: CaseResult): QcReport {
  const { summary, budget, pockets, cashflow, expensiveDebt, realityCheck } = result;

  // Ingreso - gasto - ahorro programado = sobrante. Con ingresos o partidas sin tipo no cuadra (H-26).
  // En modo nativo, las cuotas que el flujo ya no paga porque el plan saldó las deudas vuelven al
  // sobrante (H-03, ADR 0015); en modo compatible esa diferencia es 0.
  const releasedDebtPayments = budget.debtPayments.annual - cashflow.flow.debtPayments.total;
  const surplusGap =
    summary.annualIncome -
    summary.annualExpenses -
    summary.programmedSavings -
    summary.annualSurplus +
    releasedDebtPayments;

  // Lo que el presupuesto manda a bolsillos frente a lo que llega a los bolsillos generales.
  const toGeneralPockets = pockets.general.reduce((sum, row) => sum + row.monthlyContribution, 0);
  const pocketGap = budget.pockets.monthly - toGeneralPockets;

  const withoutPocket = result.budgetItems.filter(
    (entry, index) =>
      entry.expenseType === 'bolsillo' &&
      entry.pocket === null &&
      (budget.rows[index]?.annual ?? 0) > 0,
  ).length;
  const unclassifiedIncomes = input.incomes.filter(
    (income) => income.kind === null && income.monthlyAmount.amount > 0,
  ).length;
  const currencies: CurrencyCode[] = missingRates(monies(input), input.fx);
  const paidByOthers = input.budgetItems.some((entry) => entry.payer !== 'cliente');
  const otherIncome = input.incomes.some((income) => income.kind === 'otro');
  const investing = summary.annualInvestment > TOLERANCE || summary.lumpSumInvestment > TOLERANCE;

  const items: QcItem[] = [
    item('surplus_balances', 'blocking', Math.abs(surplusGap) <= TOLERANCE, {
      difference: surplusGap,
    }),
    item('pocket_contributions_match', 'blocking', Math.abs(pocketGap) <= TOLERANCE, {
      budgetMonthly: budget.pockets.monthly,
      pocketsMonthly: toGeneralPockets,
    }),
    item('allocation_within_available', 'blocking', !pockets.overAllocated, {
      excess: pockets.excess,
    }),
    item('no_income_covered', 'note', !cashflow.noIncome.deficitAlert, {
      shortfall: cashflow.noIncome.shortfall,
      positiveSum: cashflow.noIncome.positiveSum,
    }),
    item('complete_items', 'blocking', budget.incompleteRows === 0, {
      count: budget.incompleteRows,
    }),
    item('items_have_pocket', 'blocking', withoutPocket === 0, { count: withoutPocket }),
    item('incomes_classified', 'blocking', unclassifiedIncomes === 0, {
      count: unclassifiedIncomes,
    }),
    item('missing_rates', 'blocking', currencies.length === 0, { currencies }),
    item('no_investment_with_expensive_debt', 'blocking', !(expensiveDebt.exists && investing)),
    item('reality_check_done', 'warning', realityCheck.status !== 'pendiente'),
    item('reality_check_confirms', 'note', realityCheck.status !== 'revisar_gastos', {
      difference: realityCheck.difference ?? 0,
    }),
    item('third_party_counted_once', 'warning', !(paidByOthers && otherIncome)),
  ];

  const failed = (severity: QcSeverity) =>
    items.filter((entry) => !entry.passed && entry.severity === severity);
  return {
    items,
    blocking: failed('blocking'),
    needNote: failed('note'),
    warnings: failed('warning'),
  };
}
