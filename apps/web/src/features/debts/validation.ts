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
  | 'note'
  | 'firstInstallmentDate'
  | 'firstInstallmentNumber'
  | 'totalInstallments'
  | 'insurance'
  | 'originalAmount'
  | 'extraFromInstallment'
  | 'frechPoints'
  | 'frechUntil';
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
  | 'invalidOrder'
  | 'invalidInstallment'
  | 'beforeFirst'
  | 'frechIncomplete'
  | 'invalidPoints'
  | 'paymentOrTerm'
  | 'extraInstallmentWithoutExtra';

/** Campos del seguimiento cuota a cuota (hoja "Crédito" de la plantilla de créditos). */
export const TRACKING_FIELDS = [
  'firstInstallmentDate',
  'firstInstallmentNumber',
  'totalInstallments',
  'insurance',
  'originalAmount',
  'extraFromInstallment',
  'frechPoints',
  'frechUntil',
] as const satisfies readonly DebtField[];

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
  /** Cuotas atrasadas o reportes negativos (ADR 0027). */
  readonly inArrears: boolean;
  /** Solo lo escribe el asesor. */
  readonly manualOrder: string;
  readonly note: string;
  readonly firstInstallmentDate: string;
  readonly firstInstallmentNumber: string;
  readonly totalInstallments: string;
  readonly insurance: string;
  readonly originalAmount: string;
  readonly extraFromInstallment: string;
  /** Puntos de tasa efectiva anual ("4" son 4 puntos). */
  readonly frechPoints: string;
  readonly frechUntil: string;
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
  readonly in_arrears: boolean;
  readonly manual_order?: number | null;
  readonly note: string | null;
  readonly first_installment_date: string | null;
  readonly first_installment_number: number;
  readonly total_installments: number | null;
  readonly insurance_in_payment: number;
  readonly original_amount: number | null;
  readonly extra_from_installment: number | null;
  readonly frech_points: number | null;
  readonly frech_until_installment: number | null;
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
    inArrears: formData.get('inArrears') === 'on',
    manualOrder: options.advisor ? text(formData, 'manualOrder') : '',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
    firstInstallmentDate: text(formData, 'firstInstallmentDate'),
    firstInstallmentNumber: text(formData, 'firstInstallmentNumber'),
    totalInstallments: text(formData, 'totalInstallments'),
    insurance: text(formData, 'insurance'),
    originalAmount: text(formData, 'originalAmount'),
    extraFromInstallment: text(formData, 'extraFromInstallment'),
    frechPoints: text(formData, 'frechPoints'),
    frechUntil: text(formData, 'frechUntil'),
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
  const tracking = parseTracking(values, { acceptsExtra, minPayment }, errors);

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
      in_arrears: values.inArrears,
      ...(options.advisor ? { manual_order: manualOrder } : {}),
      note: values.note || null,
      ...tracking,
    },
  };
}

type TrackingRecord = Pick<
  DebtRecord,
  | 'first_installment_date'
  | 'first_installment_number'
  | 'total_installments'
  | 'insurance_in_payment'
  | 'original_amount'
  | 'extra_from_installment'
  | 'frech_points'
  | 'frech_until_installment'
>;

const NO_TRACKING: TrackingRecord = {
  first_installment_date: null,
  first_installment_number: 1,
  total_installments: null,
  insurance_in_payment: 0,
  original_amount: null,
  extra_from_installment: null,
  frech_points: null,
  frech_until_installment: null,
};

/** Un número de cuota de 1 a 600; vacío es null y mal escrito, NaN. */
function installment(text: string): number | null {
  if (!text) return null;
  return /^\d{1,3}$/.test(text) && Number(text) >= 1 && Number(text) <= 600
    ? Number(text)
    : Number.NaN;
}

/**
 * Seguimiento cuota a cuota: sin fecha de la primera cuota no hay seguimiento y los demás campos se
 * guardan vacíos. Con ella, la cuota (0 = calcularla) necesita el plazo, y el FRECH va con su
 * cuota final (RN-095).
 */
function parseTracking(
  values: DebtValues,
  debt: { readonly acceptsExtra: boolean; readonly minPayment: number },
  errors: Partial<Record<DebtField, DebtFieldError>>,
): TrackingRecord {
  if (!values.firstInstallmentDate) return NO_TRACKING;
  if (!isoDateSchema.safeParse(values.firstInstallmentDate).success) {
    errors.firstInstallmentDate = 'invalidDate';
  }
  const first = installment(values.firstInstallmentNumber) ?? 1;
  if (Number.isNaN(first)) errors.firstInstallmentNumber = 'invalidInstallment';
  const total = installment(values.totalInstallments);
  if (total !== null && Number.isNaN(total)) errors.totalInstallments = 'invalidInstallment';
  else if (total !== null && total < first) errors.totalInstallments = 'beforeFirst';
  const optionalAmount = (field: 'insurance' | 'originalAmount') => {
    const parsed = parseAmount(values[field]);
    if (parsed !== null && Number.isNaN(parsed)) errors[field] = 'invalidAmount';
    return parsed;
  };
  const insurance = optionalAmount('insurance') ?? 0;
  const original = optionalAmount('originalAmount');
  const extraFrom = installment(values.extraFromInstallment);
  if (extraFrom !== null && Number.isNaN(extraFrom)) {
    errors.extraFromInstallment = 'invalidInstallment';
  } else if (extraFrom !== null && !debt.acceptsExtra) {
    errors.extraFromInstallment = 'extraInstallmentWithoutExtra';
  }
  const points = parseDecimal(values.frechPoints.replace('%', ''), 2);
  if (points !== null && (Number.isNaN(points) || points <= 0 || points > 100)) {
    errors.frechPoints = 'invalidPoints';
  }
  const frechUntil = installment(values.frechUntil);
  if (frechUntil !== null && Number.isNaN(frechUntil)) errors.frechUntil = 'invalidInstallment';
  else if ((points === null) !== (frechUntil === null)) {
    errors[points === null ? 'frechPoints' : 'frechUntil'] = 'frechIncomplete';
  }
  if (debt.minPayment === 0 && total === null && !errors.totalInstallments) {
    errors.totalInstallments = 'paymentOrTerm';
  }
  return {
    first_installment_date: values.firstInstallmentDate,
    first_installment_number: first,
    total_installments: total,
    insurance_in_payment: insurance,
    original_amount: original === 0 ? null : original,
    extra_from_installment: extraFrom,
    frech_points: points === null ? null : Math.round(points * 100) / 10_000,
    frech_until_installment: frechUntil,
  };
}

/** El método de pago del formulario del asesor; null si no es uno del catálogo. */
export function parseDebtMethod(formData: FormData): DebtMethod | null {
  const parsed = debtMethodSchema.safeParse(formData.get('method'));
  return parsed.success ? parsed.data : null;
}
