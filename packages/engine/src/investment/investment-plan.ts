import type { CurrentInvestments } from './current-investments';

/** Un concepto de la distribución, en total y por tramo. */
export interface AllocationRow {
  readonly total: number;
  readonly growth: number;
  readonly stability: number;
}

export interface InvestmentPlan {
  /** @excel Inversión!C51:E51 */
  readonly monthly: AllocationRow;
  /** @excel Inversión!C52:E52 */
  readonly annual: AllocationRow;
  /** Aporte único desde el excedente del saldo de hoy. @excel Inversión!C53:E53 */
  readonly lumpSum: AllocationRow;
  /** Lo invertido hoy, por el tramo que ya tiene cada inversión. @excel Inversión!C54:E54 */
  readonly current: AllocationRow;
  /** Saldo de hoy más el aporte único, repartido con el % en crecimiento. @excel Inversión!C55:E55 */
  readonly target: AllocationRow;
  /**
   * Cuánto llevar a cada tramo para llegar al objetivo: positivo, llevar dinero; negativo, el
   * tramo está por encima. Los aportes nuevos pueden hacer el ajuste sin vender. @excel Inversión!D56:E56
   */
  readonly movement: { readonly growth: number; readonly stability: number };
}

/**
 * Distribución de la inversión del año (sobrante y abonos de cobros) y del aporte único entre
 * crecimiento y estabilidad, y el movimiento sugerido del saldo invertido (RN-111).
 */
export function investmentPlan(
  annualInvestment: number,
  lumpSum: number,
  current: CurrentInvestments,
  growthShare: number,
): InvestmentPlan {
  const stabilityShare = 1 - growthShare;
  const split = (total: number): AllocationRow => ({
    total,
    growth: total * growthShare,
    stability: total * stabilityShare,
  });
  const target = split(lumpSum + current.total);
  return {
    monthly: split(annualInvestment / 12),
    annual: split(annualInvestment),
    lumpSum: split(lumpSum),
    current: { total: current.total, growth: current.growth, stability: current.stability },
    target,
    movement: {
      growth: target.growth - current.growth,
      stability: target.stability - current.stability,
    },
  };
}
