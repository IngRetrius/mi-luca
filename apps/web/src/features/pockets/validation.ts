import { looksLikeAccountNumber } from '@/lib/account-number';
import { parseAmount } from '@/lib/amount';

export const POCKET_NAME_MAX = 60;
export const PURPOSE_MAX = 300;
export const WHEN_USED_MAX = 200;
export const BANK_NAME_MAX = 80;
export const BANK_NOTE_MAX = 500;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export type PocketField = 'name' | 'purpose' | 'whenUsed' | 'bank' | 'currency' | 'balance';
export type PocketFieldError =
  | 'missingName'
  | 'tooLong'
  | 'looksLikeAccount'
  | 'invalidBank'
  | 'invalidCurrency'
  | 'invalidAmount';

export interface PocketValues {
  readonly name: string;
  readonly purpose: string;
  readonly whenUsed: string;
  /** Id del banco, o vacío si no tiene. */
  readonly bank: string;
  readonly currency: string;
  readonly balance: string;
}

/** Un bolsillo general listo para guardar, con los nombres de columna de `pockets`. */
export interface PocketRecord {
  readonly name: string;
  readonly purpose: string | null;
  readonly when_used: string | null;
  readonly bank_id: string | null;
  readonly currency: string;
  readonly initial_balance: number | null;
}

export type PocketErrors = Readonly<Partial<Record<PocketField, PocketFieldError>>>;

export type PocketParse =
  | { readonly ok: true; readonly values: PocketValues; readonly record: PocketRecord }
  | { readonly ok: false; readonly values: PocketValues; readonly errors: PocketErrors };

/** Valida un bolsillo general (RN-070); la base vuelve a validar. */
export function parsePocket(
  formData: FormData,
  options: { readonly currencies: readonly string[]; readonly bankIds: readonly string[] },
): PocketParse {
  const values: PocketValues = {
    name: text(formData, 'name'),
    purpose: text(formData, 'purpose'),
    whenUsed: text(formData, 'whenUsed'),
    bank: text(formData, 'bank'),
    currency: text(formData, 'currency'),
    balance: text(formData, 'balance'),
  };
  const errors: Partial<Record<PocketField, PocketFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > POCKET_NAME_MAX) errors.name = 'tooLong';
  else if (looksLikeAccountNumber(values.name)) errors.name = 'looksLikeAccount';
  if (values.purpose.length > PURPOSE_MAX) errors.purpose = 'tooLong';
  else if (looksLikeAccountNumber(values.purpose)) errors.purpose = 'looksLikeAccount';
  if (values.whenUsed.length > WHEN_USED_MAX) errors.whenUsed = 'tooLong';
  if (values.bank && !options.bankIds.includes(values.bank)) errors.bank = 'invalidBank';
  if (!options.currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  const balance = parseAmount(values.balance);
  if (Number.isNaN(balance)) errors.balance = 'invalidAmount';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      purpose: values.purpose || null,
      when_used: values.whenUsed || null,
      bank_id: values.bank || null,
      currency: values.currency,
      initial_balance: balance,
    },
  };
}

export type BankField = 'name' | 'maxPockets' | 'note';
export type BankFieldError = 'missingName' | 'tooLong' | 'looksLikeAccount' | 'invalidMaxPockets';

export interface BankValues {
  readonly name: string;
  readonly maxPockets: string;
  readonly isRemunerated: boolean;
  readonly note: string;
}

export interface BankRecord {
  readonly name: string;
  readonly max_pockets: number | null;
  readonly is_remunerated: boolean;
  readonly note: string | null;
}

export type BankErrors = Readonly<Partial<Record<BankField, BankFieldError>>>;

export type BankParse =
  | { readonly ok: true; readonly values: BankValues; readonly record: BankRecord }
  | { readonly ok: false; readonly values: BankValues; readonly errors: BankErrors };

/** Valida un banco: solo el nombre de la entidad, sin números de cuenta (regla 9). */
export function parseBank(formData: FormData): BankParse {
  const values: BankValues = {
    name: text(formData, 'name'),
    maxPockets: text(formData, 'maxPockets'),
    isRemunerated: formData.get('isRemunerated') === 'on',
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')).trim() : '',
  };
  const errors: Partial<Record<BankField, BankFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > BANK_NAME_MAX) errors.name = 'tooLong';
  else if (looksLikeAccountNumber(values.name)) errors.name = 'looksLikeAccount';
  const maxPockets = values.maxPockets === '' ? null : Number(values.maxPockets);
  if (maxPockets !== null && (!/^\d{1,2}$/.test(values.maxPockets) || maxPockets < 1)) {
    errors.maxPockets = 'invalidMaxPockets';
  }
  if (values.note.length > BANK_NOTE_MAX) errors.note = 'tooLong';
  else if (looksLikeAccountNumber(values.note)) errors.note = 'looksLikeAccount';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      max_pockets: maxPockets,
      is_remunerated: values.isRemunerated,
      note: values.note || null,
    },
  };
}
