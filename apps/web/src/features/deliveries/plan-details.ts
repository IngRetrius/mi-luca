import { formatMoney, type Messages } from '@miluca/i18n';

import { expensivePayoffText, payoffText } from '@/features/debts';

import type { Delivery } from './queries';

/**
 * Filas de detalle del PDF según la etapa (ADR 0025): en deudas, cada deuda en su orden con su
 * salida y la salida de la deuda cara; en patrimonio, el aporte de cada meta. Van en la misma lista
 * de cifras del PDF, con lo que guardó la entrega.
 */
export function planDetailFigures(
  delivery: Delivery,
  t: Messages,
  locale: string,
): { label: string; value: string }[] {
  const results: Partial<Delivery['results']> = delivery.results;
  const money = (amount: number) => formatMoney(amount, delivery.baseCurrency, locale);
  const { stage } = delivery;
  const rows: { label: string; value: string }[] = [];

  const simulation = results.debtPlan?.simulation;
  if ((stage === 'deudas' || stage === 'completo') && simulation) {
    simulation.debts
      .map((debt, index) => ({
        debt,
        name:
          delivery.debtNames[index] || t.plan.debtUnnamed.replace('{number}', String(index + 1)),
      }))
      .filter(({ debt }) => debt.order !== null)
      .toSorted((a, b) => (a.debt.order ?? 0) - (b.debt.order ?? 0))
      .forEach(({ debt, name }) => {
        rows.push({
          label: `${t.debts.plan.orderLabel.replace('{order}', String(debt.order))} ${name}`,
          value: payoffText(t, debt, locale),
        });
      });
    if (rows.length > 0) {
      rows.push({
        label: t.debts.plan.expensivePayoff,
        value: expensivePayoffText(t, results.summary?.expensiveDebtPayoff ?? null, locale),
      });
    }
  }

  if ((stage === 'patrimonio' || stage === 'completo') && results.goals) {
    results.goals.rows.forEach((goal, index) => {
      rows.push({
        label:
          delivery.goalNames[index] || t.plan.goalUnnamed.replace('{number}', String(index + 1)),
        value: t.plan.goalMonthly.replace('{amount}', money(goal.monthlyContribution)),
      });
    });
  }
  return rows;
}
