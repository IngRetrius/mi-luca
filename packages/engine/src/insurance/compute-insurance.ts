import type { InsuranceStatus, Money } from '@miluca/domain';

import { toBaseCompat, type FxContext } from '../currency';

/** Un seguro del análisis: si ya lo tiene y la prima anual cotizada (RN-102). */
export interface InsuranceInput {
  /** Null si no se ha respondido: cuenta como seguro nuevo, igual que "no" y "cotizando". */
  readonly status: InsuranceStatus | null;
  /** @excel Seguros!H6:H15 */
  readonly annualPremiumQuoted: Money | null;
  /** Seguro de vida: con personas a cargo y sin él baja la capacidad de riesgo. @excel Seguros!F10 */
  readonly isLife: boolean;
}

export interface InsuranceRowResult {
  /** Costo mensual del seguro nuevo; 0 si ya lo tiene. @excel Seguros!I6:I15 */
  readonly monthlyCost: number;
}

export interface InsuranceResult {
  readonly rows: readonly InsuranceRowResult[];
  /**
   * Primas anuales de los seguros que no tiene. Pasan al presupuesto (fila automática) y al
   * bolsillo Seguros. @excel Seguros!H16
   */
  readonly newPremiumsAnnual: number;
  /** @excel Seguros!I16 */
  readonly newPremiumsMonthly: number;
  /**
   * Parte de las primas nuevas que aún se cotiza: el plan supone que se toma, pero se muestra
   * aparte (H-24).
   */
  readonly quotingPremiumsAnnual: number;
  /** ¿Tiene seguro de vida? Null si no hay fila de vida o no se ha respondido. */
  readonly lifeStatus: InsuranceStatus | null;
}

/** Primas de los seguros nuevos, en moneda base. Los que ya tiene están en el presupuesto. */
export function computeInsurance(rows: readonly InsuranceInput[], fx: FxContext): InsuranceResult {
  let newPremiumsAnnual = 0;
  let quotingPremiumsAnnual = 0;
  const results = rows.map((row): InsuranceRowResult => {
    if (row.status === 'si') return { monthlyCost: 0 };
    const premium = row.annualPremiumQuoted ? toBaseCompat(row.annualPremiumQuoted, fx) : 0;
    newPremiumsAnnual += premium;
    if (row.status === 'cotizando') quotingPremiumsAnnual += premium;
    return { monthlyCost: premium / 12 };
  });
  return {
    rows: results,
    newPremiumsAnnual,
    newPremiumsMonthly: newPremiumsAnnual / 12,
    quotingPremiumsAnnual,
    lifeStatus: rows.find((row) => row.isLife)?.status ?? null,
  };
}
