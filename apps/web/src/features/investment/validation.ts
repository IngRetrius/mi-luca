import {
  dropReactionSchema,
  investingExperienceSchema,
  investmentBucketSchema,
  moneyHorizonSchema,
  type DropReaction,
  type InvestingExperience,
  type InvestmentBucket,
  type MoneyHorizon,
} from '@miluca/domain';

import { looksLikeAccountNumber } from '@/lib/account-number';
import { parseAmount, parsePercent } from '@/lib/amount';

export const NAME_MAX = 80;
export const NOTE_MAX = 500;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function multiline(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

// Inversiones actuales ----------------------------------------------------------------------------

export type InvestmentField = 'name' | 'balance' | 'currency' | 'note';
export type InvestmentFieldError =
  | 'missingName'
  | 'tooLong'
  | 'looksLikeAccount'
  | 'missingAmount'
  | 'invalidAmount'
  | 'invalidCurrency';

export interface InvestmentValues {
  readonly name: string;
  /** Vacío: sin tramo (cuenta en el total, no en los tramos). */
  readonly bucket: InvestmentBucket | '';
  readonly balance: string;
  readonly currency: string;
  readonly note: string;
}

/** Una inversión lista para guardar, con los nombres de columna de `investments`. */
export interface InvestmentRecord {
  readonly name: string;
  readonly bucket: InvestmentBucket | null;
  readonly balance: number;
  readonly currency: string;
  readonly note: string | null;
}

export type InvestmentErrors = Readonly<Partial<Record<InvestmentField, InvestmentFieldError>>>;

export type InvestmentParse =
  | { readonly ok: true; readonly values: InvestmentValues; readonly record: InvestmentRecord }
  | { readonly ok: false; readonly values: InvestmentValues; readonly errors: InvestmentErrors };

/** Valida una inversión actual: plataforma o tipo, sin números de cuenta (regla 9). */
export function parseInvestment(
  formData: FormData,
  { currencies }: { readonly currencies: readonly string[] },
): InvestmentParse {
  const bucket = investmentBucketSchema.safeParse(formData.get('bucket'));
  const values: InvestmentValues = {
    name: text(formData, 'name'),
    bucket: bucket.success ? bucket.data : '',
    balance: text(formData, 'balance'),
    currency: text(formData, 'currency'),
    note: multiline(formData, 'note'),
  };
  const errors: Partial<Record<InvestmentField, InvestmentFieldError>> = {};
  if (!values.name) errors.name = 'missingName';
  else if (values.name.length > NAME_MAX) errors.name = 'tooLong';
  else if (looksLikeAccountNumber(values.name)) errors.name = 'looksLikeAccount';
  const balance = parseAmount(values.balance);
  if (balance === null) errors.balance = 'missingAmount';
  else if (Number.isNaN(balance)) errors.balance = 'invalidAmount';
  if (!currencies.includes(values.currency)) errors.currency = 'invalidCurrency';
  if (values.note.length > NOTE_MAX) errors.note = 'tooLong';
  else if (looksLikeAccountNumber(values.note)) errors.note = 'looksLikeAccount';

  if (Object.keys(errors).length > 0 || balance === null) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      name: values.name,
      bucket: values.bucket || null,
      balance,
      currency: values.currency,
      note: values.note || null,
    },
  };
}

// Perfil de riesgo --------------------------------------------------------------------------------

/** Una condición de capacidad que fija el asesor: vacío es la sugerida. */
export type CapacityChoice = '' | 'si' | 'no';

export type RiskField = 'rangePosition';
export type RiskFieldError = 'invalidPercent';

export interface RiskValues {
  readonly dropReaction: DropReaction | '';
  readonly experience: InvestingExperience | '';
  readonly horizon: MoneyHorizon | '';
  readonly variableIncome: CapacityChoice;
  readonly dependents: CapacityChoice;
  /** De 0 (mínimo del rango) a 100 (máximo). */
  readonly rangePosition: string;
}

/** Las respuestas del cliente, con los nombres de columna de `risk_profile`. */
export interface RiskAnswersRecord {
  readonly drop_reaction: DropReaction | null;
  readonly experience: InvestingExperience | null;
  readonly horizon: MoneyHorizon | null;
}

/** El criterio del asesor (guarda de columnas en la base). */
export interface RiskAdvisorRecord {
  readonly variable_income_override: boolean | null;
  readonly dependents_override: boolean | null;
  readonly range_position: number;
}

export type RiskParse =
  | {
      readonly ok: true;
      readonly values: RiskValues;
      readonly answers: RiskAnswersRecord;
      readonly advisor: RiskAdvisorRecord;
    }
  | {
      readonly ok: false;
      readonly values: RiskValues;
      readonly errors: Readonly<Partial<Record<RiskField, RiskFieldError>>>;
    };

/** Posición por defecto en el rango: la mitad, como la plantilla (`Inversión!C44`). */
export const DEFAULT_RANGE_POSITION = 0.5;

function capacity(formData: FormData, name: string): CapacityChoice {
  const value = formData.get(name);
  return value === 'si' || value === 'no' ? value : '';
}

/**
 * Perfil de riesgo (RN-112 a RN-114): tres respuestas del cliente, que pueden quedar sin responder,
 * y, del asesor, dos condiciones de capacidad y la posición en el rango (vacía es la mitad).
 */
export function parseRiskProfile(formData: FormData): RiskParse {
  const drop = dropReactionSchema.safeParse(formData.get('dropReaction'));
  const experience = investingExperienceSchema.safeParse(formData.get('experience'));
  const horizon = moneyHorizonSchema.safeParse(formData.get('horizon'));
  const values: RiskValues = {
    dropReaction: drop.success ? drop.data : '',
    experience: experience.success ? experience.data : '',
    horizon: horizon.success ? horizon.data : '',
    variableIncome: capacity(formData, 'variableIncome'),
    dependents: capacity(formData, 'dependents'),
    rangePosition: text(formData, 'rangePosition'),
  };
  const position = parsePercent(values.rangePosition);
  if (position !== null && Number.isNaN(position)) {
    return { ok: false, values, errors: { rangePosition: 'invalidPercent' } };
  }
  const override = (choice: CapacityChoice) => (choice === '' ? null : choice === 'si');
  return {
    ok: true,
    values,
    answers: {
      drop_reaction: values.dropReaction || null,
      experience: values.experience || null,
      horizon: values.horizon || null,
    },
    advisor: {
      variable_income_override: override(values.variableIncome),
      dependents_override: override(values.dependents),
      range_position: position ?? DEFAULT_RANGE_POSITION,
    },
  };
}

// Supuestos de la proyección ----------------------------------------------------------------------

export const INVESTMENT_PERCENTS = [
  'realReturnGrowth',
  'realReturnStability',
  'glideStep',
  'growthFloor',
] as const;
export type InvestmentPercent = (typeof INVESTMENT_PERCENTS)[number];
export type InvestmentSettingsField = InvestmentPercent | 'retirementAge';
export type InvestmentSettingsError = 'invalidPercent' | 'invalidAge' | 'returnTooHigh';

export type InvestmentSettingsValues = Readonly<Record<InvestmentSettingsField, string>>;

/** Columnas de `case_settings`; null es el valor de la metodología. */
export interface InvestmentSettingsRecord {
  readonly retirement_age: number | null;
  readonly real_return_growth: number | null;
  readonly real_return_stability: number | null;
  readonly growth_glide_step: number | null;
  readonly growth_floor: number | null;
}

export type InvestmentSettingsParse =
  | {
      readonly ok: true;
      readonly values: InvestmentSettingsValues;
      readonly record: InvestmentSettingsRecord;
    }
  | {
      readonly ok: false;
      readonly values: InvestmentSettingsValues;
      readonly errors: Readonly<Partial<Record<InvestmentSettingsField, InvestmentSettingsError>>>;
    };

/** Un rendimiento real de más de 50 % al año no es un supuesto prudente (y no cabe en la base). */
const MAX_REAL_RETURN = 0.5;

/**
 * Supuestos de la proyección (`Supuestos!C27:C31`): edad de retiro entera de 30 a 100 y
 * porcentajes de 0 a 100 (los rendimientos, hasta 50). Vacío es el de la metodología.
 */
export function parseInvestmentSettings(formData: FormData): InvestmentSettingsParse {
  const values = Object.fromEntries(
    [...INVESTMENT_PERCENTS, 'retirementAge'].map((field) => [field, text(formData, field)]),
  ) as Record<InvestmentSettingsField, string>;
  const errors: Partial<Record<InvestmentSettingsField, InvestmentSettingsError>> = {};
  let age: number | null = null;
  if (values.retirementAge) {
    age = /^\d{1,3}$/.test(values.retirementAge) ? Number(values.retirementAge) : Number.NaN;
    if (Number.isNaN(age) || age < 30 || age > 100) errors.retirementAge = 'invalidAge';
  }
  const percents = Object.fromEntries(
    INVESTMENT_PERCENTS.map((field) => {
      const value = parsePercent(values[field]);
      if (value !== null && Number.isNaN(value)) errors[field] = 'invalidPercent';
      else if (
        value !== null &&
        (field === 'realReturnGrowth' || field === 'realReturnStability') &&
        value > MAX_REAL_RETURN
      ) {
        errors[field] = 'returnTooHigh';
      }
      return [field, value];
    }),
  ) as Record<InvestmentPercent, number | null>;
  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      retirement_age: age,
      real_return_growth: percents.realReturnGrowth,
      real_return_stability: percents.realReturnStability,
      growth_glide_step: percents.glideStep,
      growth_floor: percents.growthFloor,
    },
  };
}
