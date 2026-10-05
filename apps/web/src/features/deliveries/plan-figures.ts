import type { KeyFigureId } from '@miluca/engine';
import { messages } from '@miluca/i18n';

import { formatKeyFigure } from '@/features/summary';

/** Las cifras que muestra un plan entregado, en el orden del Resumen. */
export const PLAN_FIGURES: readonly KeyFigureId[] = [
  'annualIncome',
  'annualExpenses',
  'programmedSavings',
  'annualSurplus',
  'savingsRate',
  'ownSavingsRate',
  'emergencyGoal',
  'emergencyProgress',
  'noIncomeShortfall',
  'annualInvestment',
];

export function formatFigure(
  id: KeyFigureId,
  value: number | null | undefined,
  locale: string,
  currency: string,
): string {
  return formatKeyFigure(id, value, { locale, currency, months: messages.es.keyFigureMonths });
}
