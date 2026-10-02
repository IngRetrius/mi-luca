/** Estado de la prueba de realidad (RN-052). */
export type RealityCheckStatus = 'pendiente' | 'confirmada' | 'revisar_gastos';

/** Saldos que da el cliente, en moneda base, sin ingresos extraordinarios (herencias, ventas). */
export interface RealityCheckInput {
  /** Ahorro total hace N meses: cuentas, bolsillos e inversiones. @excel Supuestos!C35 */
  readonly savingsMonthsAgo: number | null;
  /** @excel Supuestos!C36 */
  readonly months: number | null;
  /** @excel Supuestos!C37 */
  readonly savingsToday: number | null;
}

export interface RealityCheckParameters {
  /** % del sobrante a inversión con la prueba confirmada. @excel Supuestos!C23 */
  readonly pctInvestConfirmed: number;
  /** % del sobrante a inversión mientras no se confirma. @excel Supuestos!C24 */
  readonly pctInvestPending: number;
}

export interface RealityCheck {
  /** Null mientras falte algún dato o si N es 0 (en Excel, #¡DIV/0!). @excel Supuestos!C38 */
  readonly actualMonthly: number | null;
  /** Sobrante anual más ahorro programado, por mes. @excel Supuestos!C39 */
  readonly expectedMonthly: number;
  /** (Real - esperado) / |esperado|; null sin real o sin esperado. @excel Supuestos!C40 */
  readonly difference: number | null;
  /** @excel Supuestos!C41 */
  readonly status: RealityCheckStatus;
  /** @excel Supuestos!C42 */
  readonly pctToInvestment: number;
}

/** Se confirma si el ahorro real llega al 85 % del esperado (protocolo, sección 6.2). */
const TOLERANCE = 0.15;

/**
 * Prueba de realidad (RN-050 a RN-053): compara lo que el cliente ahorró de verdad en N meses con
 * lo que el plan dice que ahorra. Mientras no se confirme, se invierte un % menor del sobrante.
 */
export function realityCheck(
  input: RealityCheckInput,
  annualSurplus: number,
  annualProgrammedSavings: number,
  parameters: RealityCheckParameters,
): RealityCheck {
  const { savingsMonthsAgo, months, savingsToday } = input;
  const actualMonthly =
    savingsMonthsAgo === null || months === null || months === 0 || savingsToday === null
      ? null
      : (savingsToday - savingsMonthsAgo) / months;
  const expectedMonthly = (annualSurplus + annualProgrammedSavings) / 12;
  const difference =
    actualMonthly === null || expectedMonthly === 0
      ? null
      : (actualMonthly - expectedMonthly) / Math.abs(expectedMonthly);
  const status: RealityCheckStatus =
    difference === null ? 'pendiente' : difference >= -TOLERANCE ? 'confirmada' : 'revisar_gastos';
  return {
    actualMonthly,
    expectedMonthly,
    difference,
    status,
    pctToInvestment:
      status === 'confirmada' ? parameters.pctInvestConfirmed : parameters.pctInvestPending,
  };
}
