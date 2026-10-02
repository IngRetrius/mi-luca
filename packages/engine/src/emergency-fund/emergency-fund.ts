import type { IncomeKind } from '@miluca/domain';

/** Escenarios del fondo de emergencia (RN-080): qué ingreso se pierde. */
export type EmergencyScenarioId = 'a' | 'b' | 'c';

export interface EmergencyScenario {
  /** Ingreso mensual que se mantiene. @excel Fondo emergencia!C14:C16 */
  readonly keptIncome: number;
  /** Gasto esencial que ese ingreso no cubre. @excel Fondo emergencia!D14:D16 */
  readonly monthlyShortfall: number;
  /**
   * Meses que la meta vigente cubre ese faltante; null si el ingreso lo cubre ("Cubierto por el
   * ingreso"). @excel Fondo emergencia!E14:E16
   */
  readonly monthsCovered: number | null;
}

export interface EmergencyFundInput {
  /** @excel Presupuesto!I89 */
  readonly totalMonthlyExpenses: number;
  /** @excel Presupuesto!I95 */
  readonly essentialMonthly: number;
  /** Ingreso mensual promedio por tipo. @excel Ingresos!U20:U23 */
  readonly monthlyIncomeByKind: Readonly<Record<IncomeKind, number>>;
  /** Meses de fondo efectivos del caso. @excel Supuestos!C21 */
  readonly months: number;
  /** @excel Deudas!C23 */
  readonly hasExpensiveDebt: boolean;
}

export interface EmergencyFund {
  /** A pierde el ingreso laboral; B, las rentas; C, los dos (peor caso). */
  readonly scenarios: Readonly<Record<EmergencyScenarioId, EmergencyScenario>>;
  /** @excel Fondo emergencia!C17 */
  readonly months: number;
  /** Meses de cobertura por el faltante del peor caso. @excel Fondo emergencia!C18 */
  readonly worstCaseGoal: number;
  /** Un mes de gasto esencial. @excel Fondo emergencia!C19 */
  readonly minimumGoal: number;
  /** @excel Fondo emergencia!C20 */
  readonly fullGoal: number;
  /** Con deuda cara, un mes de lo esencial; luego se paga la deuda y se completa. @excel Fondo emergencia!C21 */
  readonly currentGoal: number;
  /** Regla de comparación: 6 meses de gasto total. @excel Fondo emergencia!C22 */
  readonly sixMonthRule: number;
  /** Capital que se libera frente a esa regla. @excel Fondo emergencia!C23 */
  readonly releasedVsSixMonthRule: number;
}

/**
 * Fondo de emergencia (RN-080 a RN-084): la meta cubre el faltante del peor escenario durante los
 * meses del caso, con un mínimo de un mes de gasto esencial. Con deuda cara, la meta vigente baja a
 * un mes de lo esencial.
 */
export function emergencyFund(input: EmergencyFundInput): EmergencyFund {
  const { laboral, renta, pension, otro } = input.monthlyIncomeByKind;
  const essential = input.essentialMonthly;
  const shortfall = (kept: number) => Math.max(0, essential - kept);

  const keptIncome: Record<EmergencyScenarioId, number> = {
    a: renta + pension + otro,
    b: laboral + pension + otro,
    c: pension,
  };
  const worstCaseGoal = input.months * shortfall(keptIncome.c);
  const minimumGoal = essential;
  const fullGoal = Math.max(worstCaseGoal, minimumGoal);
  const currentGoal = input.hasExpensiveDebt ? Math.min(fullGoal, essential) : fullGoal;

  const scenario = (id: EmergencyScenarioId): EmergencyScenario => {
    const monthlyShortfall = shortfall(keptIncome[id]);
    return {
      keptIncome: keptIncome[id],
      monthlyShortfall,
      monthsCovered:
        monthlyShortfall === 0 ? null : currentGoal === 0 ? 0 : currentGoal / monthlyShortfall,
    };
  };

  const sixMonthRule = 6 * input.totalMonthlyExpenses;
  return {
    scenarios: { a: scenario('a'), b: scenario('b'), c: scenario('c') },
    months: input.months,
    worstCaseGoal,
    minimumGoal,
    fullGoal,
    currentGoal,
    sixMonthRule,
    releasedVsSixMonthRule: sixMonthRule - fullGoal,
  };
}

export interface EmergencyProgress {
  /** Saldo del bolsillo del fondo. @excel Fondo emergencia!C24 */
  readonly assigned: number;
  /** Frente a la meta completa; 1 si la meta es 0. @excel Fondo emergencia!C25 */
  readonly vsFullGoal: number;
  /** Frente a la meta vigente (H-11); 1 si la meta es 0. */
  readonly vsCurrentGoal: number;
}

/** Avance del fondo con el saldo asignado a su bolsillo (RN-084, H-11). */
export function emergencyProgress(assigned: number, fund: EmergencyFund): EmergencyProgress {
  return {
    assigned,
    vsFullGoal: fund.fullGoal === 0 ? 1 : assigned / fund.fullGoal,
    vsCurrentGoal: fund.currentGoal === 0 ? 1 : assigned / fund.currentGoal,
  };
}
