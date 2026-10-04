import { parseAmount } from '@/lib/amount';

export const CATEGORY_MAX = 60;

export type MonthEntryError = 'invalidAmount' | 'invalidCurrency';

/** Lo que se escribió en una fila, para devolverlo al formulario si algo falla. */
export interface MonthEntryValues {
  readonly amount: string;
  readonly currency: string;
}

/** Una fila lista para guardar: con importe se guarda; vacía se borra. */
export interface MonthEntryRecord {
  readonly category: string;
  readonly amount: number | null;
  readonly currency: string;
}

export type MonthParse =
  | {
      readonly ok: true;
      readonly values: readonly MonthEntryValues[];
      readonly records: readonly MonthEntryRecord[];
    }
  | {
      readonly ok: false;
      readonly values: readonly MonthEntryValues[];
      readonly errors: Readonly<Record<number, MonthEntryError>>;
    };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Lee el gasto real de un mes: una fila por categoría (`category-N`, `amount-N`, `currency-N`).
 * Vacío es "sin registro" y borra lo que hubiera; 0 es un mes registrado sin gasto. Las
 * categorías llegan del formulario: las ajenas o demasiado largas se descartan.
 */
export function parseMonthEntries(
  formData: FormData,
  options: { readonly currencies: readonly string[] },
): MonthParse {
  const count = Math.min(Number(text(formData, 'count')) || 0, 200);
  const values: MonthEntryValues[] = [];
  const records: MonthEntryRecord[] = [];
  const errors: Record<number, MonthEntryError> = {};
  for (let index = 0; index < count; index += 1) {
    const category = text(formData, `category-${index}`);
    const value: MonthEntryValues = {
      amount: text(formData, `amount-${index}`),
      currency: text(formData, `currency-${index}`) || (options.currencies[0] ?? ''),
    };
    values.push(value);
    if (!category || category.length > CATEGORY_MAX) continue;
    const amount = parseAmount(value.amount);
    if (amount !== null && Number.isNaN(amount)) errors[index] = 'invalidAmount';
    else if (!options.currencies.includes(value.currency)) errors[index] = 'invalidCurrency';
    else records.push({ category, amount, currency: value.currency });
  }
  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return { ok: true, values, records };
}
