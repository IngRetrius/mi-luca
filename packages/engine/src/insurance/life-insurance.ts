/** Años de apoyo de la plantilla cuando hay personas a cargo (H-10). @excel Seguros!C22 */
export const DEFAULT_SUPPORT_YEARS = 10;

export interface LifeInsuranceInput {
  /** Saldo total de deudas. @excel Seguros!C20 */
  readonly debts: number;
  /** Gasto anual que se quiere cubrir. @excel Seguros!C21 */
  readonly annualToCover: number;
  /** Años de apoyo a dependientes. @excel Seguros!C22 */
  readonly supportYears: number;
  /** Saldo líquido más inversiones. @excel Seguros!C23 */
  readonly liquidAndInvestments: number;
}

export interface LifeInsuranceSum extends LifeInsuranceInput {
  /** Orientativa: cotizar con 2 o 3 aseguradoras (RN-103). @excel Seguros!C24 */
  readonly sumInsured: number;
}

/** Suma asegurada orientativa de vida: deudas más años de gasto, menos lo que ya tiene. */
export function lifeInsuranceSum(input: LifeInsuranceInput): LifeInsuranceSum {
  return {
    ...input,
    sumInsured: Math.max(
      0,
      input.debts + input.annualToCover * input.supportYears - input.liquidAndInvestments,
    ),
  };
}
