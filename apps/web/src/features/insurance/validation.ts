import { insuranceStatusSchema, type InsuranceStatus } from '@miluca/domain';

import { looksLikeAccountNumber } from '@/lib/account-number';
import { parseAmount, parseDecimal } from '@/lib/amount';

export const NAME_MAX = 80;
export const NOTE_MAX = 500;
export const BENEFICIARIES_MAX = 300;

/** Seguros del análisis, en el orden de `Seguros!B6:B13`, más los que agregue el asesor. */
export const INSURANCE_TYPES = [
  'hogar',
  'arrendamiento',
  'enfermedades_graves',
  'renta_hospitalizacion',
  'vida',
  'complementario',
  'desempleo',
  'vehiculo',
  'otro',
] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export function isInsuranceType(value: unknown): value is InsuranceType {
  return typeof value === 'string' && (INSURANCE_TYPES as readonly string[]).includes(value);
}

export type InsuranceField = 'customName' | 'premium' | 'currency' | 'beneficiaries' | 'note';
export type InsuranceFieldError =
  'missingName' | 'tooLong' | 'looksLikeAccount' | 'invalidAmount' | 'invalidCurrency';

export interface InsuranceValues {
  readonly insuranceType: InsuranceType;
  readonly customName: string;
  readonly status: InsuranceStatus | '';
  readonly premium: string;
  readonly currency: string;
  readonly beneficiaries: string;
  readonly note: string;
}

/** Un seguro listo para guardar, con los nombres de columna de `insurances`. */
export interface InsuranceRecord {
  readonly insurance_type: InsuranceType;
  readonly custom_name: string | null;
  readonly status: InsuranceStatus | null;
  readonly annual_premium_quoted: number | null;
  readonly currency: string;
  readonly beneficiaries_note: string | null;
  readonly note: string | null;
}

export type InsuranceErrors = Readonly<Partial<Record<InsuranceField, InsuranceFieldError>>>;

export type InsuranceParse =
  | { readonly ok: true; readonly values: InsuranceValues; readonly record: InsuranceRecord }
  | { readonly ok: false; readonly values: InsuranceValues; readonly errors: InsuranceErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Valida un seguro (RN-102): solo primas cotizadas, sin números de póliza. El tipo "otro" lleva
 * nombre; la prima es anual y en la moneda que se elija.
 */
export function parseInsurance(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): InsuranceParse {
  const type = formData.get('insuranceType');
  const status = insuranceStatusSchema.safeParse(formData.get('status'));
  const values: InsuranceValues = {
    insuranceType: isInsuranceType(type) ? type : 'otro',
    customName: text(formData, 'customName'),
    status: status.success ? status.data : '',
    premium: text(formData, 'premium'),
    currency: text(formData, 'currency'),
    beneficiaries: text(formData, 'beneficiaries'),
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<InsuranceField, InsuranceFieldError>> = {};
  if (values.insuranceType === 'otro') {
    if (!values.customName) errors.customName = 'missingName';
    else if (values.customName.length > NAME_MAX) errors.customName = 'tooLong';
    else if (looksLikeAccountNumber(values.customName)) errors.customName = 'looksLikeAccount';
  }
  const premium = parseAmount(values.premium);
  if (premium !== null && Number.isNaN(premium)) errors.premium = 'invalidAmount';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  if (values.beneficiaries.length > BENEFICIARIES_MAX) errors.beneficiaries = 'tooLong';
  else if (looksLikeAccountNumber(values.beneficiaries)) errors.beneficiaries = 'looksLikeAccount';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';
  else if (looksLikeAccountNumber(values.note)) errors.note = 'looksLikeAccount';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      insurance_type: values.insuranceType,
      custom_name: values.insuranceType === 'otro' ? values.customName : null,
      status: values.status || null,
      annual_premium_quoted: premium,
      currency: values.currency,
      beneficiaries_note: values.beneficiaries || null,
      note: values.note || null,
    },
  };
}

// Supuestos del seguro de vida y bolsillo de las primas --------------------------------------------

export type LifeField = 'supportYears' | 'annualToCover';
export type LifeFieldError = 'invalidYears' | 'invalidAmount';

export interface LifeValues {
  readonly supportYears: string;
  readonly annualToCover: string;
  readonly pocketId: string;
}

/** Columnas de `case_settings`; null es el valor de la plantilla (H-10). */
export interface LifeRecord {
  readonly life_support_years: number | null;
  readonly life_annual_to_cover: number | null;
  readonly insurance_pocket_id: string | null;
}

export type LifeParse =
  | { readonly ok: true; readonly values: LifeValues; readonly record: LifeRecord }
  | {
      readonly ok: false;
      readonly values: LifeValues;
      readonly errors: Readonly<Partial<Record<LifeField, LifeFieldError>>>;
    };

/** Años de apoyo (0 a 60, un decimal), gasto anual a cubrir y bolsillo de las primas nuevas. */
export function parseLifeSettings(
  formData: FormData,
  { pocketIds }: { readonly pocketIds: readonly string[] },
): LifeParse {
  const pocketId = text(formData, 'pocketId');
  const values: LifeValues = {
    supportYears: text(formData, 'supportYears'),
    annualToCover: text(formData, 'annualToCover'),
    pocketId: pocketIds.includes(pocketId) ? pocketId : '',
  };
  const errors: Partial<Record<LifeField, LifeFieldError>> = {};
  const years = parseDecimal(values.supportYears, 1);
  if (years !== null && (Number.isNaN(years) || years > 60)) errors.supportYears = 'invalidYears';
  const annual = parseAmount(values.annualToCover);
  if (annual !== null && Number.isNaN(annual)) errors.annualToCover = 'invalidAmount';
  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      life_support_years: years,
      life_annual_to_cover: annual,
      insurance_pocket_id: values.pocketId || null,
    },
  };
}
