import { isoDateSchema } from '@miluca/domain';

import { parseAmount, parsePercent } from '@/lib/amount';

export const DEBTOR_MAX = 60;
export const NOTE_MAX = 500;

export type ReceivableField =
  'debtor' | 'balance' | 'payment' | 'currency' | 'firstPayment' | 'pctToInvestment' | 'note';
export type ReceivableFieldError =
  | 'missingDebtor'
  | 'tooLong'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency'
  | 'invalidDate'
  | 'invalidPercent';

export interface ReceivableValues {
  readonly debtor: string;
  readonly balance: string;
  readonly payment: string;
  readonly currency: string;
  readonly firstPayment: string;
  /** De 0 a 100; solo lo escribe el asesor. */
  readonly pctToInvestment: string;
  readonly note: string;
}

/** Un cobro listo para guardar, con los nombres de columna de `receivables`. */
export interface ReceivableRecord {
  readonly debtor_label: string;
  readonly currency: string;
  readonly balance: number;
  readonly monthly_payment: number;
  readonly first_payment_date: string | null;
  readonly pct_to_investment?: number;
  readonly note: string | null;
}

export type ReceivableErrors = Readonly<Partial<Record<ReceivableField, ReceivableFieldError>>>;

export type ReceivableParse =
  | { readonly ok: true; readonly values: ReceivableValues; readonly record: ReceivableRecord }
  | { readonly ok: false; readonly values: ReceivableValues; readonly errors: ReceivableErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Valida un cobro (RN-060): quién debe (sin nombre completo si no hace falta), saldo y cuota
 * mayores que 0, fecha del primer pago. El % a inversión solo llega del asesor; sin él, la base
 * conserva el que había (o el 100 % por defecto).
 */
export function parseReceivable(
  formData: FormData,
  options: { readonly currencies: readonly string[]; readonly advisor: boolean },
): ReceivableParse {
  const values: ReceivableValues = {
    debtor: text(formData, 'debtor'),
    balance: text(formData, 'balance'),
    payment: text(formData, 'payment'),
    currency: text(formData, 'currency'),
    firstPayment: text(formData, 'firstPayment'),
    pctToInvestment: options.advisor ? text(formData, 'pctToInvestment') : '',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<ReceivableField, ReceivableFieldError>> = {};
  if (!values.debtor) errors.debtor = 'missingDebtor';
  else if (values.debtor.length > DEBTOR_MAX) errors.debtor = 'tooLong';
  const positive = (field: 'balance' | 'payment') => {
    const amount = parseAmount(values[field]);
    if (amount === null) errors[field] = 'missingAmount';
    else if (Number.isNaN(amount) || amount <= 0) errors[field] = 'invalidAmount';
    return amount ?? 0;
  };
  const balance = positive('balance');
  const payment = positive('payment');
  if (!options.currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  if (values.firstPayment && !isoDateSchema.safeParse(values.firstPayment).success) {
    errors.firstPayment = 'invalidDate';
  }
  const pct = parsePercent(values.pctToInvestment);
  if (Number.isNaN(pct)) errors.pctToInvestment = 'invalidPercent';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      debtor_label: values.debtor,
      currency: values.currency,
      balance,
      monthly_payment: payment,
      first_payment_date: values.firstPayment || null,
      ...(options.advisor ? { pct_to_investment: pct ?? 1 } : {}),
      note: values.note || null,
    },
  };
}
