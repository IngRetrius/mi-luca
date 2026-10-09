import type { CaseResult } from '@miluca/engine';
import type { PdfTable } from '@miluca/exporters/pdf';
import { formatMoney, formatPercent, type Messages } from '@miluca/i18n';

import { expensivePayoffText, formatMonth, payoffText } from '@/features/debts/client';

import { indicatorLines } from './indicator-text';
import { planIndicators } from './indicators';
import { pocketTable } from './plan-rows';
import type { Delivery } from './queries';

/**
 * Las tablas del PDF de un plan entregado, en el orden en que el cliente las usa (ADR 0028): cómo va
 * el plan, los bolsillos con lo que se pasa cada mes, el plan de pago de las deudas y el aporte a
 * cada meta. Solo las de la etapa del reporte; lee lo que guardó la entrega, así el PDF siempre es el
 * mismo (ADR 0020).
 */
export function planPdfTables(delivery: Delivery, t: Messages, locale: string): PdfTable[] {
  const text = t.plan;
  const results: Partial<CaseResult> = delivery.results;
  const money = (amount: number) => formatMoney(amount, delivery.baseCurrency, locale);
  const percent = (ratio: number) => formatPercent(ratio, locale, 0);
  const { stage } = delivery;
  const tables: PdfTable[] = [];

  const indicators = planIndicators(stage, results);
  if (indicators.length > 0) {
    tables.push({
      title: text.indicators.title,
      rows: indicators.map((indicator) => {
        const lines = indicatorLines(indicator, text.indicators, money, percent);
        return {
          cells: [lines.label, `${lines.value} · ${t.status[indicator.status]}`],
          detail: `${lines.sentence} ${lines.reference}`,
        };
      }),
      note: text.indicators.note,
    });
  }

  if (stage === 'presupuesto' || stage === 'completo') {
    const pockets = pocketTable(
      results,
      delivery.pocketNames,
      {
        emergency: text.emergency,
        noIncome: text.noIncome,
        unnamed: t.pockets.unnamed,
        fund: { done: text.fundDone, completes: text.fundComplete, never: text.fundNever },
      },
      (month) => formatMonth(month, locale),
    );
    if (pockets) {
      const table = text.pocketsTable;
      tables.push({
        title: table.title,
        columns: [table.pocket, table.monthly, table.balance],
        rows: pockets.rows.map((row) => ({
          cells: [
            row.name,
            row.monthly === null ? table.fundFill : money(row.monthly),
            money(row.balance),
          ],
          ...(row.note ? { detail: row.note } : {}),
        })),
        footer: [table.total, money(pockets.total), ''],
        note: pockets.fundFromSurplus ? `${table.automate} ${table.fundNote}` : table.automate,
      });
    }
  }

  const simulation = results.debtPlan?.simulation;
  if ((stage === 'deudas' || stage === 'completo') && simulation) {
    const debtText = t.debts.plan;
    const ordered = simulation.debts
      .map((debt, index) => ({
        debt,
        name: delivery.debtNames[index] || text.debtUnnamed.replace('{number}', String(index + 1)),
      }))
      .filter(({ debt }) => debt.order !== null)
      .toSorted((a, b) => (a.debt.order ?? 0) - (b.debt.order ?? 0));
    if (ordered.length > 0) {
      tables.push({
        title: text.debtTitle,
        rows: [
          ...ordered.map(({ debt, name }) => ({
            cells: [
              `${debtText.orderLabel.replace('{order}', String(debt.order))} ${name}`,
              payoffText(t, debt, locale),
            ],
            detail: debtText.interest.replace('{amount}', money(debt.interestWithPlan ?? 0)),
          })),
          {
            cells: [
              debtText.expensivePayoff,
              expensivePayoffText(t, results.summary?.expensiveDebtPayoff ?? null, locale),
            ],
          },
        ],
        footer: [debtText.totalPayment, money(simulation.totalPayment)],
        note: `${debtText.methods[delivery.debtMethod]}. ${debtText.methodHints[delivery.debtMethod]} ${debtText.illustrative}`,
      });
    }
  }

  const goals = results.goals;
  if ((stage === 'patrimonio' || stage === 'completo') && goals && goals.rows.length > 0) {
    tables.push({
      title: text.goalsTitle,
      rows: goals.rows.map((goal, index) => ({
        cells: [
          delivery.goalNames[index] || text.goalUnnamed.replace('{number}', String(index + 1)),
          text.goalMonthly.replace('{amount}', money(goal.monthlyContribution)),
        ],
      })),
      footer: [text.goalsTotal, money(goals.monthlyTotal)],
    });
  }

  return tables;
}
