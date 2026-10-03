import { debtMethodSchema, isoDateSchema, type DebtMethod } from '@miluca/domain';

import { parseAmount, parseDecimal } from '@/lib/amount';

export const NAME_MAX = 80;
export const LENDER_MAX = 80;
export const NOTE_MAX = 500;
// La base admite hasta 1.000 % EA (`debts.annual_rate`, hasta 10): préstamos informales muy caros.
const MAX_RATE_PERCENT = 1000;

/** Tipos de deuda de `debts.debt_type`, en el orden de la lista de la plantilla. */
export const DEBT_TYPES = [
  'tarjeta_credito',
  'libre_inversion',
  'vehiculo',
  'hipotecario',
  'libranza',
  'informal',
  'otro',
] as const;
export type DebtType = (typeof DEBT_TYPES)[number];

export type DebtField =
  | 'name'
  | 'debtType'
  | 'lender'
  | 'balance'
  | 'currency'
  | 'rate'
  | 'minPayment'
  | 'acceptsExtra'
  | 'extraFrom'
  | 'manualOrder'
  | 'note';
export type DebtFieldError =
  | 'missingName'
  | 'tooLong'
  | 'invalidType'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency'
  | 'invalidRate'
  | 'invalidDate'
  | 'extraFromWithoutExtra'
  | 'invalidOrder';

export interface DebtValues {
  readonly name: string;
  readonly debtType: string;
  readonly lender: string;
  readonly balance: string;
  readonly currency: string;
  /** Tasa efectiva anual en porcentaje ("28", "12,5"). */
  readonly rate: string;
  readonly minPayment: string;
  /** "si" o "no". */
  readonly acceptsExtra: string;
  readonly extraFrom: string;
  /** Solo lo escribe el asesor. */
  readonly manualOrder: string;
  readonly note: string;
}

/** Una deuda lista para guardar, con los nombres de columna de `debts`. */
export interface DebtRecord {
  readonly name: string;
  readonly debt_type: DebtType;
  readonly lender_name: string | null;
  readonly currency: string;
  readonly balance: number;
  readonly annual_rate: number;
  readonly min_payment: number;
  readonly accepts_extra: boolean;
  readonly extra_from_date: string | null;
  readonly manual_order?: number | null;
  readonly note: string | null;
}

export type DebtErrors = Readonly<Partial<Record<DebtField, DebtFieldError>>>;

export type DebtParse =
  | { readonly ok: true; readonly values: DebtValues; readonly record: DebtRecord }
  | { readonly ok: false; readonly values: DebtValues; readonly errors: DebtErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function isDebtType(value: string): value is DebtType {
  return (DEBT_TYPES as readonly string[]).includes(value);
}

/**
 * Valida una deuda del inventario: nombre sin números de tarjeta ni de crédito (solo se pide un
 * nombre), tipo del catálogo, saldo y cuota de 0 o más, tasa efectiva anual en porcentaje y la
 * restricción de abonos (RN-092). El lugar en el orden manual solo llega del asesor; sin él, la base
 * conserva el que había.
 */
export function parseDebt(
  formData: FormData,
  options: { readonly currencies: readonly string[]; readonly advisor: boolean },
): DebtParse {
  const values: DebtValues = {
    name: text(formData, 'name'),
    debtType: text(formData, 'debtType'),
    lender: text(formData, 'lender'),
    balance: text(formData, 'balance'),
    currency: text(formData, 'currency'),
    rate: text(formData, 'rate'),
    minPayment: text(formData, 'minPayment'),
    acceptsExtra: text(formData, 'acceptsExtra') === 'no' ? 'no' : 'si',
    extraFrom: text(formData, 'extraFrom'),
    manualOrder: options.advisor ? text(formData, 'manualOrder') : '',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<DebtField, DebtFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > NAME_MAX) errors.name = 'tooLong';
  if (!isDebtType(values.debtType)) errors.debtType = 'invalidType';
  if (values.lender.length > LENDER_MAX) errors.lender = 'tooLong';
  const amount = (field: 'balance' | 'minPayment') => {
    const parsed = parseAmount(values[field]);
    if (parsed === null) errors[field] = 'missingAmount';
    else if (Number.isNaN(parsed)) errors[field] = 'invalidAmount';
    return parsed ?? 0;
  };
  const balance = amount('balance');
  const minPayment = amount('minPayment');
  if (!options.currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  const ratePercent = parseDecimal(values.rate.replace('%', ''), 4);
  if (ratePercent === null || Number.isNaN(ratePercent) || ratePercent > MAX_RATE_PERCENT) {
    errors.rate = 'invalidRate';
  }
  const acceptsExtra = values.acceptsExtra === 'si';
  if (values.extraFrom && !isoDateSchema.safeParse(values.extraFrom).success) {
    errors.extraFrom = 'invalidDate';
  } else if (values.extraFrom && !acceptsExtra) {
    errors.extraFrom = 'extraFromWithoutExtra';
  }
  let manualOrder: number | null = null;
  if (values.manualOrder) {
    manualOrder = /^\d{1,2}$/.test(values.manualOrder) ? Number(values.manualOrder) : Number.NaN;
    if (!(manualOrder >= 1 && manualOrder <= 99)) errors.manualOrder = 'invalidOrder';
  }
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      debt_type: values.debtType as DebtType,
      lender_name: values.lender || null,
      currency: values.currency,
      balance,
      // Seis decimales, como `annual_rate`: 12,3456 % es 0,123456.
      annual_rate: Math.round((ratePercent ?? 0) * 10_000) / 1_000_000,
      min_payment: minPayment,
      accepts_extra: acceptsExtra,
      extra_from_date: values.extraFrom || null,
      ...(options.advisor ? { manual_order: manualOrder } : {}),
      note: values.note || null,
    },
  };
}

/** El método de pago del formulario del asesor; null si no es uno del catálogo. */
export function parseDebtMethod(formData: FormData): DebtMethod | null {
  const parsed = debtMethodSchema.safeParse(formData.get('method'));
  return parsed.success ? parsed.data : null;
}
