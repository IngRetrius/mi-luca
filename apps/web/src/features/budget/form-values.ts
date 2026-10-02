import type { Database } from '@miluca/db';
import { expenseTypeSchema, frequencySchema, payerSchema } from '@miluca/domain';

import { amountToText } from '@/lib/amount';

import type { BudgetItemValues } from './validation';

type BudgetRow = Database['public']['Tables']['budget_items']['Row'];

/** Valores iniciales de un gasto nuevo: mensual, pago directo y lo paga el cliente. */
export function emptyBudgetValues(baseCurrency: string): BudgetItemValues {
  return {
    category: '',
    concept: '',
    currency: baseCurrency,
    amount: '',
    frequency: 'mensual',
    durationDays: '',
    expenseType: 'directo',
    essential: false,
    payer: 'cliente',
    payerLabel: '',
    isTemporary: false,
    familyReference: false,
    note: '',
    basicAmount: '',
    isProposed: false,
  };
}

/** Un gasto guardado, para editarlo con los importes escritos como en su país. */
export function budgetValuesFromRow(row: BudgetRow, locale: string): BudgetItemValues {
  const frequency = frequencySchema.safeParse(row.frequency);
  const expenseType = expenseTypeSchema.safeParse(row.expense_type);
  return {
    category: row.category,
    concept: row.concept,
    currency: row.currency,
    amount: amountToText(row.amount, locale),
    frequency: frequency.success ? frequency.data : '',
    durationDays: row.duration_days === null ? '' : amountToText(row.duration_days, locale),
    expenseType: expenseType.success ? expenseType.data : '',
    essential: row.essential,
    payer: payerSchema.catch('cliente').parse(row.payer),
    payerLabel: row.payer_label ?? '',
    isTemporary: row.is_temporary,
    familyReference: row.scope === 'referencia_familiar',
    note: row.note ?? '',
    basicAmount: amountToText(row.basic_amount, locale),
    isProposed: row.is_proposed,
  };
}
