import { assetTypeSchema, type AssetType } from '@miluca/domain';

import { looksLikeAccountNumber } from '@/lib/account-number';
import { parseAmount } from '@/lib/amount';

export const NAME_MAX = 80;
export const NOTE_MAX = 500;

export type AssetField = 'name' | 'value' | 'currency' | 'note';
export type AssetFieldError =
  | 'missingName'
  | 'tooLong'
  | 'looksLikeAccount'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency';

export interface AssetValues {
  readonly name: string;
  readonly assetType: AssetType;
  readonly value: string;
  readonly currency: string;
  readonly generatesIncome: boolean;
  readonly note: string;
}

/** Un activo listo para guardar, con los nombres de columna de `assets`. */
export interface AssetRecord {
  readonly name: string;
  readonly asset_type: AssetType;
  readonly value: number;
  readonly currency: string;
  readonly generates_income: boolean;
  readonly note: string | null;
}

export type AssetErrors = Readonly<Partial<Record<AssetField, AssetFieldError>>>;

export type AssetParse =
  | { readonly ok: true; readonly values: AssetValues; readonly record: AssetRecord }
  | { readonly ok: false; readonly values: AssetValues; readonly errors: AssetErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/** Valida un activo de Patrimonio (RN-110): sin números de cuenta en el nombre (regla 9). */
export function parseAsset(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): AssetParse {
  const assetType = assetTypeSchema.safeParse(formData.get('assetType'));
  const values: AssetValues = {
    name: text(formData, 'name'),
    assetType: assetType.success ? assetType.data : 'liquido',
    value: text(formData, 'value'),
    currency: text(formData, 'currency'),
    generatesIncome: formData.get('generatesIncome') === 'on',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<AssetField, AssetFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > NAME_MAX) errors.name = 'tooLong';
  else if (looksLikeAccountNumber(values.name)) errors.name = 'looksLikeAccount';
  const value = parseAmount(values.value);
  if (value === null) errors.value = 'missingAmount';
  else if (Number.isNaN(value)) errors.value = 'invalidAmount';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';
  else if (looksLikeAccountNumber(values.note)) errors.note = 'looksLikeAccount';

  if (Object.keys(errors).length > 0 || value === null) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      asset_type: values.assetType,
      value,
      currency: values.currency,
      generates_income: values.generatesIncome,
      note: values.note || null,
    },
  };
}
