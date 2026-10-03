import { isoDateSchema } from '@miluca/domain';

import { parseAmount } from '@/lib/amount';

export type InstallmentField = 'paid' | 'paidOn' | 'customPayment' | 'extraPayment';
export type InstallmentFieldError = 'invalidAmount' | 'invalidDate' | 'paidOnWithoutPaid';

export interface InstallmentValues {
  /** "si" o "no". */
  readonly paid: string;
  readonly paidOn: string;
  readonly customPayment: string;
  readonly extraPayment: string;
}

/** Una marca lista para guardar, con los nombres de columna de `debt_installments`. */
export interface InstallmentRecord {
  readonly paid: boolean;
  readonly paid_on: string | null;
  readonly custom_payment: number | null;
  readonly extra_payment: number | null;
}

export type InstallmentErrors = Readonly<Partial<Record<InstallmentField, InstallmentFieldError>>>;

export type InstallmentParse =
  | { readonly ok: true; readonly values: InstallmentValues; readonly record: InstallmentRecord }
  | { readonly ok: false; readonly values: InstallmentValues; readonly errors: InstallmentErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** Valida la marca de una cuota (RN-099): pagada con su fecha real, cuota distinta y abono extra. */
export function parseInstallment(formData: FormData): InstallmentParse {
  const values: InstallmentValues = {
    paid: text(formData, 'paid') === 'si' ? 'si' : 'no',
    paidOn: text(formData, 'paidOn'),
    customPayment: text(formData, 'customPayment'),
    extraPayment: text(formData, 'extraPayment'),
  };
  const errors: Partial<Record<InstallmentField, InstallmentFieldError>> = {};
  const paid = values.paid === 'si';
  if (values.paidOn && !isoDateSchema.safeParse(values.paidOn).success) {
    errors.paidOn = 'invalidDate';
  } else if (values.paidOn && !paid) {
    errors.paidOn = 'paidOnWithoutPaid';
  }
  const positive = (field: 'customPayment' | 'extraPayment') => {
    const amount = parseAmount(values[field]);
    if (amount !== null && (Number.isNaN(amount) || amount <= 0)) errors[field] = 'invalidAmount';
    return amount;
  };
  const customPayment = positive('customPayment');
  const extraPayment = positive('extraPayment');
  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      paid,
      paid_on: paid ? values.paidOn || null : null,
      custom_payment: customPayment,
      extra_payment: extraPayment,
    },
  };
}

/** Una marca sin nada que guardar: la fila se borra. */
export function isEmptyMark(record: InstallmentRecord): boolean {
  return !record.paid && record.custom_payment === null && record.extra_payment === null;
}
