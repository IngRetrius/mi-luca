import {
  deviation,
  deviationAlert,
  monthlyControl,
  type MonthlyControlResult,
} from '@miluca/engine';
import { formatPercent, messages } from '@miluca/i18n';

import type { ComputedCase } from '@/features/summary';

import { controlCategories } from './control-view';
import type { MonthRowDeviation } from './month-form';
import type { MonthlyControlEntryRow } from './queries';

const text = messages.es.monthlyControl;

/** El control del año con las categorías del presupuesto del cliente (motor). */
export function yearControl(
  computed: ComputedCase,
  entries: readonly MonthlyControlEntryRow[],
): MonthlyControlResult {
  const { result, input, rows } = computed;
  const automatic = result.budgetItems.length - input.budgetItems.length;
  const monthly = (index: number) => result.budget.rows[index]?.monthlyAverage ?? 0;
  const { categories, budgetItems } = controlCategories({
    automatic: {
      debts: monthly(0),
      insurance: monthly(1),
      goals: Array.from({ length: Math.max(automatic - 2, 0) }, (_, index) => monthly(index + 2)),
    },
    items: rows.budgetItems.flatMap((item) => {
      const row = computed.budgetRowById.get(item.id);
      return row ? [{ category: item.category, monthlyAverage: row.monthlyAverage }] : [];
    }),
    recorded: [...new Set(entries.map((entry) => entry.category))],
    labels: text.automaticCategories,
  });
  return monthlyControl(
    categories,
    budgetItems,
    entries.map((entry) => ({
      category: entry.category,
      month: entry.month,
      amount: { amount: entry.amount, currency: entry.currency },
    })),
    input.fx,
  );
}

/** Desviación escrita con el porcentaje redondeado; con estado si pasa del umbral. */
export function deviationText(
  real: number | null,
  budget: number,
  locale: string,
): MonthRowDeviation | null {
  if (real === null) return null;
  const value = deviation(real, budget);
  if (value === null) return { label: text.noBudget, status: null };
  const alert = deviationAlert(value);
  const pct = formatPercent(Math.abs(value), locale, 0);
  if (alert === 'over') return { label: text.over.replace('{pct}', pct), status: 'warning' };
  if (alert === 'under') return { label: text.under.replace('{pct}', pct), status: 'warning' };
  return { label: text.onBudget, status: null };
}
