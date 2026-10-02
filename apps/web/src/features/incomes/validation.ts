import { incomeKindSchema, type IncomeKind } from '@miluca/domain';

import { parseAmount } from '@/lib/amount';

export const NAME_MAX = 120;
export const NOTE_MAX = 1000;
const MONTHS = 12;

export type IncomeField = 'name' | 'amount' | 'currency' | 'payments' | 'note';
export type IncomeFieldError =
  | 'missingName'
  | 'tooLong'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency'
  | 'invalidPayments';

export interface IncomeValues {
  readonly name: string;
  readonly kind: IncomeKind;
  readonly currency: string;
  readonly amount: string;
  /** Lo escrito en cada mes, de enero a diciembre. */
  readonly payments: readonly string[];
  readonly isNet: boolean;
  readonly savingsOnly: boolean;
  readonly note: string;
}

/** Un ingreso listo para guardar, con los nombres de columna de `incomes`. */
export interface IncomeRecord {
  readonly name: string;
  readonly kind: IncomeKind;
  readonly currency: string;
  readonly amount: number;
  readonly is_net: boolean;
  readonly payments_by_month: number[];
  readonly allocation: 'general' | 'ahorro_total';
  readonly note: string | null;
}

export type IncomeErrors = Readonly<Partial<Record<IncomeField, IncomeFieldError>>>;

export type IncomeParse =
  | { readonly ok: true; readonly values: IncomeValues; readonly record: IncomeRecord }
  | { readonly ok: false; readonly values: IncomeValues; readonly errors: IncomeErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/** Pagos de un mes: un entero de 0 a 9 (dos pagos en un mes, por ejemplo con la prima: H-22). */
function payment(value: string): number | null {
  return /^\d$/.test(value) ? Number(value) : null;
}

/**
 * Valida el formulario de un ingreso (P-A04 bloque B, Mis ingresos) antes de guardarlo; la base
 * vuelve a validar. También sirve, sin guardar, para la vista previa del impacto.
 */
export function parseIncome(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): IncomeParse {
  const kind = incomeKindSchema.safeParse(formData.get('kind'));
  const values: IncomeValues = {
    name: text(formData, 'name'),
    kind: kind.success ? kind.data : 'laboral',
    currency: text(formData, 'currency'),
    amount: text(formData, 'amount'),
    payments: Array.from({ length: MONTHS }, (_, month) => text(formData, `payment-${month}`)),
    isNet: formData.get('isNet') === 'on',
    savingsOnly: formData.get('savingsOnly') === 'on',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };

  const errors: Partial<Record<IncomeField, IncomeFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > NAME_MAX) errors.name = 'tooLong';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  const amount = parseAmount(values.amount);
  if (amount === null) errors.amount = 'missingAmount';
  else if (Number.isNaN(amount)) errors.amount = 'invalidAmount';
  const payments = values.payments.map(payment);
  if (payments.some((value) => value === null)) errors.payments = 'invalidPayments';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (Object.keys(errors).length > 0 || amount === null) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      kind: values.kind,
      currency: values.currency,
      amount,
      is_net: values.isNet,
      payments_by_month: payments as number[],
      allocation: values.savingsOnly ? 'ahorro_total' : 'general',
      note: values.note || null,
    },
  };
}

/** Meses con seguridad social: una casilla por mes, marcada = 1 pago (RN-021). */
export function parseSocialSecurityMonths(formData: FormData): number[] {
  return Array.from({ length: MONTHS }, (_, month) =>
    formData.get(`month-${month}`) === 'on' ? 1 : 0,
  );
}

export type VariableIncomeError = 'invalidAmount' | 'invalidCurrency';

export type VariableIncomeParse =
  | {
      readonly ok: true;
      readonly currency: string;
      /** Lo recibido en cada mes; null en los meses sin dato. */
      readonly amounts: readonly (number | null)[];
    }
  | {
      readonly ok: false;
      readonly error: VariableIncomeError;
      readonly invalidMonths: readonly number[];
    };

/** Calculadora de ingreso base (RN-013): lo recibido en cada uno de los últimos 12 meses. */
export function parseVariableIncome(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): VariableIncomeParse {
  const currency = text(formData, 'currency');
  if (!currencies.includes(currency))
    return { ok: false, error: 'invalidCurrency', invalidMonths: [] };
  const amounts = Array.from({ length: MONTHS }, (_, month) =>
    parseAmount(text(formData, `amount-${month}`)),
  );
  const invalidMonths = amounts.flatMap((amount, month) => (Number.isNaN(amount) ? [month] : []));
  if (invalidMonths.length > 0) return { ok: false, error: 'invalidAmount', invalidMonths };
  return { ok: true, currency, amounts };
}
