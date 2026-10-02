import { parseAmount } from '@/lib/amount';

export type RealityField = 'savingsAgo' | 'months' | 'savingsToday' | 'currency';
export type RealityFieldError = 'invalidAmount' | 'invalidMonths' | 'invalidCurrency';

export interface RealityValues {
  readonly savingsAgo: string;
  readonly months: string;
  readonly savingsToday: string;
  readonly currency: string;
}

/** Los saldos de la prueba, con los nombres de columna de `reality_check`. Vacío es null. */
export interface RealityRecord {
  readonly currency: string;
  readonly savings_n_ago: number | null;
  readonly n_months: number | null;
  readonly savings_today: number | null;
}

export type RealityErrors = Readonly<Partial<Record<RealityField, RealityFieldError>>>;

export type RealityParse =
  | { readonly ok: true; readonly values: RealityValues; readonly record: RealityRecord }
  | { readonly ok: false; readonly values: RealityValues; readonly errors: RealityErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Prueba de realidad (RN-050): ahorro total hace N meses y hoy, sin ingresos extraordinarios.
 * Se puede guardar a medias: mientras falte un dato, la prueba queda pendiente.
 */
export function parseRealityCheck(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): RealityParse {
  const values: RealityValues = {
    savingsAgo: text(formData, 'savingsAgo'),
    months: text(formData, 'months'),
    savingsToday: text(formData, 'savingsToday'),
    currency: text(formData, 'currency'),
  };
  const errors: Partial<Record<RealityField, RealityFieldError>> = {};
  const savingsAgo = parseAmount(values.savingsAgo);
  if (Number.isNaN(savingsAgo)) errors.savingsAgo = 'invalidAmount';
  const savingsToday = parseAmount(values.savingsToday);
  if (Number.isNaN(savingsToday)) errors.savingsToday = 'invalidAmount';
  const months = values.months === '' ? null : Number(values.months);
  if (months !== null && (!/^\d{1,3}$/.test(values.months) || months < 1 || months > 120)) {
    errors.months = 'invalidMonths';
  }
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      currency: values.currency,
      savings_n_ago: savingsAgo,
      n_months: months,
      savings_today: savingsToday,
    },
  };
}
