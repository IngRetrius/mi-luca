import type { Payer } from '@miluca/domain';

import type { AnnualAndMonthly, BudgetItemInput, BudgetResult } from '../budget';
import { toBaseCompat, type FxContext } from '../currency';

export type CostLevel = 'essential' | 'basic' | 'current';

const LEVELS: readonly CostLevel[] = ['essential', 'basic', 'current'];

/** Costo anual de una partida en cada nivel; 0 si es ahorro. @excel Costo de vida!D:F */
export type CostOfLivingRow = Readonly<Record<CostLevel, number>>;

export interface CostOfLivingLevel extends AnnualAndMonthly {
  /** Cuánto paga cada pagador al año. @excel Costo de vida!D30:F30 */
  readonly byPayer: Readonly<Record<Payer, number>>;
  /** Sin los gastos temporales, como la matrícula. @excel Costo de vida!D32:F32 */
  readonly withoutTemporary: AnnualAndMonthly;
}

/**
 * Con qué se compara un umbral: el ingreso propio, el gasto de cada nivel o el patrimonio bruto. Sin
 * base, con el ingreso y el gasto, como la plantilla (ADR 0027).
 */
export type ThresholdBasis = 'income' | 'spending' | 'assets';

/** Umbral fiscal anual que aplica a este cliente, en moneda base (parámetro del país). */
export interface FiscalThreshold {
  readonly code: string;
  readonly annualLimit: number;
  readonly basis?: ThresholdBasis;
}

export interface ThresholdComparison extends FiscalThreshold {
  /** ¿El ingreso propio supera el umbral? @excel Costo de vida!E36 */
  readonly ownIncomeExceeds: boolean;
  /** ¿El costo anual de cada nivel lo supera? @excel Costo de vida!D37:F37 */
  readonly levelExceeds: Readonly<Record<CostLevel, boolean>>;
  /** ¿El patrimonio bruto (todos los activos) lo supera? Para los umbrales de patrimonio. */
  readonly grossAssetsExceeds: boolean;
}

export interface CostOfLivingResult {
  readonly rows: readonly CostOfLivingRow[];
  /** @excel Costo de vida!D25:F31 */
  readonly levels: Readonly<Record<CostLevel, CostOfLivingLevel>>;
  readonly thresholds: readonly ThresholdComparison[];
}

export interface CostOfLivingOptions {
  /** Umbrales que aplican al cliente; cuáles aplican se decide por cliente, no por país. */
  readonly thresholds?: readonly FiscalThreshold[];
  /** Ingreso anual propio, para compararlo con los umbrales. */
  readonly ownIncome?: number;
  /** Patrimonio bruto (activos, inversiones y cobros), para los umbrales de patrimonio. */
  readonly grossAssets?: number;
}

/**
 * Costo de vida por niveles (RN-030 a RN-032): esencial (el actual si la partida es esencial),
 * básico (el valor que propone el asesor, o el actual) y actual (el del presupuesto). Para cada
 * nivel: costo anual y mensual, cuánto paga cada pagador y el costo sin gastos temporales. El
 * ahorro no es costo de vida, así que el nivel actual es el gasto sin ahorro del presupuesto.
 *
 * `budget` es el resultado de `computeBudget` con las mismas partidas, en el mismo orden.
 */
export function computeCostOfLiving(
  items: readonly BudgetItemInput[],
  budget: BudgetResult,
  fx: FxContext,
  options: CostOfLivingOptions = {},
): CostOfLivingResult {
  const rows = items.map((item, index): CostOfLivingRow => {
    const row = budget.rows[index];
    if (!row || item.expenseType === 'ahorro') return { essential: 0, basic: 0, current: 0 };
    const current = row.annual;
    let basic = current;
    if (item.basicAmount) {
      const amount = toBaseCompat(item.basicAmount, fx);
      basic = amount === 0 || row.timesPerYear === null ? 0 : amount * row.timesPerYear;
    }
    return { essential: item.essential ? current : 0, basic, current };
  });

  const level = (which: CostLevel): CostOfLivingLevel => {
    let annual = 0;
    let temporary = 0;
    const byPayer: Record<Payer, number> = { cliente: 0, familia: 0, tercero: 0 };
    rows.forEach((row, index) => {
      const item = items[index]!;
      annual += row[which];
      byPayer[item.payer] += row[which];
      if (item.isTemporary) temporary += row[which];
    });
    const withoutTemporary = annual - temporary;
    return {
      annual,
      monthly: annual / 12,
      byPayer,
      withoutTemporary: { annual: withoutTemporary, monthly: withoutTemporary / 12 },
    };
  };
  const levels = Object.fromEntries(LEVELS.map((which) => [which, level(which)])) as Record<
    CostLevel,
    CostOfLivingLevel
  >;

  const ownIncome = options.ownIncome ?? 0;
  const grossAssets = options.grossAssets ?? 0;
  const thresholds = (options.thresholds ?? []).map((threshold): ThresholdComparison => ({
    ...threshold,
    ownIncomeExceeds: ownIncome > threshold.annualLimit,
    grossAssetsExceeds: grossAssets > threshold.annualLimit,
    levelExceeds: Object.fromEntries(
      LEVELS.map((which) => [which, levels[which].annual > threshold.annualLimit]),
    ) as Record<CostLevel, boolean>,
  }));

  return { rows, levels, thresholds };
}
