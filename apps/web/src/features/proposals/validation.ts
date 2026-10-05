import { parseAmount } from '@/lib/amount';

import { ADJUSTMENT_KINDS, type AdjustmentKind } from './scenario';

export const REASON_MAX = 500;

export type AdjustmentField = 'item' | 'kind' | 'amount' | 'reason';
export type AdjustmentFieldError =
  'missingItem' | 'invalidKind' | 'invalidAmount' | 'sameAmount' | 'tooLong';

export interface AdjustmentValues {
  readonly item: string;
  readonly kind: string;
  readonly amount: string;
  readonly reason: string;
}

/** Un gasto que se puede ajustar: los del presupuesto que suman. */
export interface AdjustableItem {
  readonly id: string;
  readonly amount: number | null;
}

export interface AdjustmentRecord {
  readonly budgetItemId: string;
  readonly kind: AdjustmentKind;
  readonly amount: number | null;
  readonly reason: string | null;
}

export type AdjustmentErrors = Readonly<Partial<Record<AdjustmentField, AdjustmentFieldError>>>;

export type AdjustmentParse =
  | { readonly ok: true; readonly values: AdjustmentValues; readonly record: AdjustmentRecord }
  | { readonly ok: false; readonly values: AdjustmentValues; readonly errors: AdjustmentErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Valida un ajuste (ADR 0024): el gasto (fijo al editar), cambiar el valor o quitarlo, el valor
 * nuevo por pago y el porqué.
 */
export function parseAdjustment(
  formData: FormData,
  options: { readonly items: readonly AdjustableItem[]; readonly fixedItemId: string | null },
): AdjustmentParse {
  const values: AdjustmentValues = {
    item: options.fixedItemId ?? text(formData, 'item'),
    kind: text(formData, 'kind'),
    amount: text(formData, 'amount'),
    reason: text(formData, 'reason'),
  };
  const errors: Partial<Record<AdjustmentField, AdjustmentFieldError>> = {};
  const item = options.items.find((row) => row.id === values.item);
  if (!item) errors.item = 'missingItem';
  const kind = ADJUSTMENT_KINDS.find((option) => option === values.kind);
  if (!kind) errors.kind = 'invalidKind';
  let amount: number | null = null;
  if (kind === 'ajustar') {
    amount = parseAmount(values.amount);
    if (amount === null || Number.isNaN(amount)) errors.amount = 'invalidAmount';
    else if (item && item.amount === amount) errors.amount = 'sameAmount';
  }
  if (values.reason.length > REASON_MAX) errors.reason = 'tooLong';

  if (Object.keys(errors).length > 0 || !item || !kind) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      budgetItemId: item.id,
      kind,
      amount: kind === 'quitar' ? null : amount,
      reason: values.reason || null,
    },
  };
}
