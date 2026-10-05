import {
  expenseTypeSchema,
  frequencySchema,
  payerSchema,
  type ExpenseType,
  type Frequency,
  type Payer,
} from '@miluca/domain';
import { canonicalCategory } from '@miluca/i18n';

import { parseAmount } from '@/lib/amount';

export const CATEGORY_MAX = 60;
export const CONCEPT_MAX = 120;
export const PAYER_LABEL_MAX = 60;
export const NOTE_MAX = 1000;

export type BudgetItemField =
  | 'category'
  | 'concept'
  | 'amount'
  | 'currency'
  | 'durationDays'
  | 'payerLabel'
  | 'note'
  | 'basicAmount'
  | 'pocket';
export type BudgetItemFieldError =
  | 'missingCategory'
  | 'missingConcept'
  | 'tooLong'
  | 'invalidAmount'
  | 'missingDays'
  | 'invalidCurrency'
  | 'invalidPocket';

/** Lo escrito en el formulario, tal cual, para volver a mostrarlo si hay errores. */
export interface BudgetItemValues {
  readonly category: string;
  readonly concept: string;
  readonly currency: string;
  readonly amount: string;
  readonly frequency: Frequency | '';
  readonly durationDays: string;
  readonly expenseType: ExpenseType | '';
  /** Id del bolsillo que la financia, o vacío. */
  readonly pocket: string;
  readonly essential: boolean;
  readonly payer: Payer;
  readonly payerLabel: string;
  readonly isTemporary: boolean;
  /** Gasto con datos de salud (C5, C20). */
  readonly isHealth: boolean;
  readonly familyReference: boolean;
  readonly note: string;
  readonly basicAmount: string;
  readonly isProposed: boolean;
}

/** Una partida lista para guardar, con los nombres de columna de `budget_items`. */
export interface BudgetItemRecord {
  readonly category: string;
  readonly concept: string;
  readonly currency: string;
  readonly amount: number | null;
  readonly frequency: Frequency | null;
  readonly duration_days: number | null;
  readonly expense_type: ExpenseType | null;
  readonly pocket_id: string | null;
  readonly essential: boolean;
  readonly payer: Payer;
  readonly payer_label: string | null;
  readonly scope: 'presupuesto' | 'referencia_familiar';
  readonly is_temporary: boolean;
  readonly is_health: boolean;
  readonly note: string | null;
  readonly basic_amount: number | null;
  readonly is_proposed: boolean;
}

export type BudgetItemErrors = Readonly<Partial<Record<BudgetItemField, BudgetItemFieldError>>>;

export type BudgetItemParse =
  | { readonly ok: true; readonly values: BudgetItemValues; readonly record: BudgetItemRecord }
  | { readonly ok: false; readonly values: BudgetItemValues; readonly errors: BudgetItemErrors };

export interface BudgetItemParseOptions {
  /** Monedas que se pueden usar: la base y las que tienen tasa (RN-017). */
  readonly currencies: readonly string[];
  /** Solo el asesor escribe el nivel básico y la marca de propuesto; del cliente se ignoran. */
  readonly advisor: boolean;
  /** Bolsillos generales del cliente (RN-027). */
  readonly pocketIds: readonly string[];
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === 'on';
}

/**
 * Valida el formulario de un gasto (P-A06, P-C07) antes de guardarlo; la base vuelve a validar.
 * También sirve, sin guardar, para la vista previa del impacto mientras se escribe.
 */
export function parseBudgetItem(
  formData: FormData,
  { currencies, advisor, pocketIds }: BudgetItemParseOptions,
): BudgetItemParse {
  const frequency = frequencySchema.safeParse(formData.get('frequency'));
  const expenseType = expenseTypeSchema.safeParse(formData.get('expenseType'));
  const payer = payerSchema.safeParse(formData.get('payer'));
  const values: BudgetItemValues = {
    category: text(formData, 'category'),
    concept: text(formData, 'concept'),
    currency: text(formData, 'currency'),
    amount: text(formData, 'amount'),
    frequency: frequency.success ? frequency.data : '',
    durationDays: text(formData, 'durationDays'),
    expenseType: expenseType.success ? expenseType.data : '',
    pocket: text(formData, 'pocket'),
    essential: checked(formData, 'essential'),
    payer: payer.success ? payer.data : 'cliente',
    payerLabel: text(formData, 'payerLabel'),
    isTemporary: checked(formData, 'isTemporary'),
    isHealth: checked(formData, 'isHealth'),
    familyReference: checked(formData, 'familyReference'),
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
    basicAmount: advisor ? text(formData, 'basicAmount') : '',
    isProposed: advisor && checked(formData, 'isProposed'),
  };

  const errors: Partial<Record<BudgetItemField, BudgetItemFieldError>> = {};
  if (!values.category) errors.category = 'missingCategory';
  else if (values.category.length > CATEGORY_MAX) errors.category = 'tooLong';
  if (!values.concept) errors.concept = 'missingConcept';
  else if (values.concept.length > CONCEPT_MAX) errors.concept = 'tooLong';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  const amount = parseAmount(values.amount);
  if (Number.isNaN(amount)) errors.amount = 'invalidAmount';
  const basicAmount = parseAmount(values.basicAmount);
  if (Number.isNaN(basicAmount)) errors.basicAmount = 'invalidAmount';
  let durationDays: number | null = null;
  if (values.frequency === 'por_duracion') {
    durationDays = parseAmount(values.durationDays);
    if (durationDays === null || Number.isNaN(durationDays) || durationDays <= 0) {
      errors.durationDays = 'missingDays';
    }
  }
  if (values.pocket && !pocketIds.includes(values.pocket)) errors.pocket = 'invalidPocket';
  if (values.payerLabel.length > PAYER_LABEL_MAX) errors.payerLabel = 'tooLong';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      // Una categoría conocida se guarda con su valor canónico, en cualquier idioma (ADR 0022).
      category: canonicalCategory(values.category),
      concept: values.concept,
      currency: values.currency,
      amount,
      frequency: values.frequency || null,
      duration_days: durationDays,
      expense_type: values.expenseType || null,
      pocket_id: values.pocket || null,
      essential: values.essential,
      payer: values.payer,
      payer_label: values.payer === 'cliente' ? null : values.payerLabel || null,
      scope: values.familyReference ? 'referencia_familiar' : 'presupuesto',
      is_temporary: values.isTemporary,
      is_health: values.isHealth,
      note: values.note || null,
      basic_amount: basicAmount,
      is_proposed: values.isProposed,
    },
  };
}
