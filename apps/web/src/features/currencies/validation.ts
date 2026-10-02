import { parseDecimal } from '@/lib/amount';

export const NOTE_MAX = 500;
const CURRENCY = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type FxRateField = 'currency' | 'rate' | 'asOf' | 'note';
export type FxRateFieldError =
  'invalidCurrency' | 'isBase' | 'duplicate' | 'invalidRate' | 'invalidDate' | 'tooLong';

export interface FxRateValues {
  readonly currency: string;
  readonly rate: string;
  readonly asOf: string;
  readonly note: string;
}

/** Una tasa lista para guardar, con los nombres de columna de `client_fx_rates`. */
export interface FxRateRecord {
  readonly currency: string;
  readonly rate_to_base: number;
  readonly as_of: string;
  readonly note: string | null;
}

export type FxRateErrors = Readonly<Partial<Record<FxRateField, FxRateFieldError>>>;

export type FxRateParse =
  | { readonly ok: true; readonly values: FxRateValues; readonly record: FxRateRecord }
  | { readonly ok: false; readonly values: FxRateValues; readonly errors: FxRateErrors };

export interface FxRateParseOptions {
  readonly baseCurrency: string;
  /** Monedas que ya tienen tasa; al crear, una de ellas es un duplicado. */
  readonly existing: readonly string[];
  /** Al editar, la moneda no cambia: viene de la ruta. */
  readonly fixedCurrency: string | null;
  /** Hoy en el país del cliente: la tasa no puede ser de una fecha futura. */
  readonly today: string;
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Valida el formulario de una tasa (P-A19) antes de guardarla; la base vuelve a validar. */
export function parseFxRate(formData: FormData, options: FxRateParseOptions): FxRateParse {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const values: FxRateValues = {
    currency: options.fixedCurrency ?? text('currency').toUpperCase(),
    rate: text('rate'),
    asOf: text('asOf'),
    note: text('note'),
  };

  const errors: Partial<Record<FxRateField, FxRateFieldError>> = {};
  if (!CURRENCY.test(values.currency)) errors.currency = 'invalidCurrency';
  else if (values.currency === options.baseCurrency) errors.currency = 'isBase';
  else if (options.fixedCurrency === null && options.existing.includes(values.currency)) {
    errors.currency = 'duplicate';
  }
  const rate = parseDecimal(values.rate, 8);
  if (rate === null || Number.isNaN(rate) || rate <= 0) errors.rate = 'invalidRate';
  if (!isRealDate(values.asOf) || values.asOf > options.today) errors.asOf = 'invalidDate';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (Object.keys(errors).length > 0 || rate === null) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      currency: values.currency,
      rate_to_base: rate,
      as_of: values.asOf,
      note: values.note || null,
    },
  };
}
