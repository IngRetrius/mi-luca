import { parseAmount, parseDecimal, parsePercent } from '@/lib/amount';

/** Los porcentajes del plan; vacío es el de la metodología. */
export const PLAN_PERCENTS = [
  'expensiveDebtThreshold',
  'pctInvestConfirmed',
  'pctInvestPending',
  'pctSurplusToDebt',
  'pctExcessToInvest',
] as const;
export type PlanPercent = (typeof PLAN_PERCENTS)[number];

export type PlanField = PlanPercent | 'emergencyMonths' | 'cushion';
export type PlanFieldError = 'invalidMonths' | 'invalidPercent' | 'invalidAmount';

export type PlanValues = Readonly<Record<PlanField, string>>;

/** Columnas de `case_settings` que fija el asesor; null es el valor de la metodología. */
export interface PlanRecord {
  readonly emergency_months_override: number | null;
  readonly expensive_debt_threshold: number | null;
  readonly pct_surplus_invest_confirmed: number | null;
  readonly pct_surplus_invest_pending: number | null;
  readonly pct_surplus_to_debt: number | null;
  readonly pct_excess_to_invest: number | null;
  readonly operating_cushion: number;
}

export type PlanErrors = Readonly<Partial<Record<PlanField, PlanFieldError>>>;

export type PlanParse =
  | { readonly ok: true; readonly values: PlanValues; readonly record: PlanRecord }
  | { readonly ok: false; readonly values: PlanValues; readonly errors: PlanErrors };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Supuestos del plan (Supuestos!C20:C32): meses de fondo (más de 0 y hasta 24, con un decimal),
 * porcentajes de 0 a 100 y el colchón de la cuenta operativa en moneda base (vacío es 0).
 */
export function parsePlanSettings(formData: FormData): PlanParse {
  const values = Object.fromEntries(
    [...PLAN_PERCENTS, 'emergencyMonths', 'cushion'].map((field) => [field, text(formData, field)]),
  ) as Record<PlanField, string>;
  const errors: Partial<Record<PlanField, PlanFieldError>> = {};
  const months = parseDecimal(values.emergencyMonths, 1);
  if (months !== null && (Number.isNaN(months) || months <= 0 || months > 24)) {
    errors.emergencyMonths = 'invalidMonths';
  }
  const percents = Object.fromEntries(
    PLAN_PERCENTS.map((field) => {
      const value = parsePercent(values[field]);
      if (Number.isNaN(value)) errors[field] = 'invalidPercent';
      return [field, value];
    }),
  ) as Record<PlanPercent, number | null>;
  const cushion = parseAmount(values.cushion);
  if (Number.isNaN(cushion)) errors.cushion = 'invalidAmount';

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };
  return {
    ok: true,
    values,
    record: {
      emergency_months_override: months,
      expensive_debt_threshold: percents.expensiveDebtThreshold,
      pct_surplus_invest_confirmed: percents.pctInvestConfirmed,
      pct_surplus_invest_pending: percents.pctInvestPending,
      pct_surplus_to_debt: percents.pctSurplusToDebt,
      pct_excess_to_invest: percents.pctExcessToInvest,
      operating_cushion: cushion ?? 0,
    },
  };
}
