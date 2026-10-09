import type { CaseStage, DeliveryStage } from '@miluca/domain';
import type { KeyFigureId, QcCode, QcReport } from '@miluca/engine';
import type { Messages } from '@miluca/i18n';

export type AssumptionKey = keyof Messages['assumptions']['labels'];

/** Controles que aplican a cualquier entrega: sin ellos ninguna cifra es confiable (ADR 0025). */
export const COMMON_CHECKS: readonly QcCode[] = ['incomes_classified', 'missing_rates'];

/** Controles de calidad de cada etapa, además de los comunes (ADR 0025). */
export const STAGE_CHECKS: Readonly<Record<CaseStage, readonly QcCode[]>> = {
  presupuesto: [
    'surplus_balances',
    'pocket_contributions_match',
    'allocation_within_available',
    'no_income_covered',
    'complete_items',
    'items_have_pocket',
    'reality_check_done',
    'reality_check_confirms',
    'third_party_counted_once',
  ],
  deudas: [],
  patrimonio: [
    'no_investment_with_expensive_debt',
    'risk_profile_answered',
    'short_horizon_in_stability',
    'growth_within_range',
  ],
};

/**
 * El control de calidad de una entrega: los controles de su etapa y los comunes. El plan completo
 * usa todos. Filtra la salida de `qualityChecks` sin tocar el motor.
 */
export function reportForStage(report: QcReport, stage: DeliveryStage): QcReport {
  if (stage === 'completo') return report;
  const codes = new Set<QcCode>([...COMMON_CHECKS, ...STAGE_CHECKS[stage]]);
  const keep = <T extends { readonly code: QcCode }>(items: readonly T[]) =>
    items.filter((item) => codes.has(item.code));
  return {
    items: keep(report.items),
    blocking: keep(report.blocking),
    needNote: keep(report.needNote),
    warnings: keep(report.warnings),
  };
}

/** Cifras del núcleo: las que importan en cualquier etapa. */
export const CORE_FIGURES: readonly KeyFigureId[] = ['annualIncome'];

/**
 * Cifras de cada etapa, en el orden del Resumen. La inversión del año va en patrimonio: depende del
 * perfil de riesgo y de que no haya deuda cara, aunque salga del sobrante de la etapa 1.
 */
export const STAGE_FIGURES: Readonly<Record<CaseStage, readonly KeyFigureId[]>> = {
  presupuesto: [
    'annualExpenses',
    'programmedSavings',
    'annualSurplus',
    'savingsRate',
    'ownSavingsRate',
    'emergencyGoal',
    'emergencyProgress',
    'noIncomeShortfall',
  ],
  deudas: ['totalDebt', 'debtLoad', 'expensiveDebtMonths'],
  patrimonio: ['netWorth', 'annualInvestment', 'growthShare'],
};

/** Las etapas que cubre una entrega: una sola o, en el plan completo, las tres en orden. */
export function deliveryStages(stage: DeliveryStage): readonly CaseStage[] {
  return stage === 'completo' ? ['presupuesto', 'deudas', 'patrimonio'] : [stage];
}

/** Las cifras de un conjunto de etapas: las del núcleo y las de cada etapa, sin repetir. */
export function figuresFor(stages: readonly CaseStage[]): readonly KeyFigureId[] {
  return [...CORE_FIGURES, ...stages.flatMap((stage) => STAGE_FIGURES[stage])];
}

/**
 * Supuestos que mueven las cifras de cada etapa, para que el reporte muestre solo los suyos: el fondo
 * y el colchón deciden los bolsillos; el umbral de deuda cara y lo que va a deudas, el plan de pago;
 * los porcentajes a inversión, la edad de retiro y los rendimientos, la inversión. El excedente del
 * saldo de hoy va a deudas si hay deuda cara y si no a inversión: sale en las dos.
 */
export const STAGE_ASSUMPTIONS: Readonly<Record<CaseStage, readonly AssumptionKey[]>> = {
  presupuesto: ['emergencyMonths', 'cushion'],
  deudas: ['expensiveDebtThreshold', 'pctSurplusToDebt', 'pctExcessToInvest'],
  patrimonio: [
    'pctInvestConfirmed',
    'pctInvestPending',
    'pctExcessToInvest',
    'retirementAge',
    'realReturnGrowth',
    'realReturnStability',
    'glideStep',
    'growthFloor',
  ],
};

/** Los supuestos de una entrega; null en el plan completo, que los muestra todos. */
export function assumptionsFor(stage: DeliveryStage): ReadonlySet<AssumptionKey> | null {
  return stage === 'completo' ? null : new Set(STAGE_ASSUMPTIONS[stage]);
}
