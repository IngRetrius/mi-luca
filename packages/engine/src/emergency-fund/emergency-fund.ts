import type { IncomeKind, IncomeScenario } from '@miluca/domain';

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

/** Un ingreso mensual y el escenario en que se pierde (`ninguno`: se mantiene siempre). */
export interface IncomeLoss {
  readonly monthly: number;
  readonly lostIn: IncomeScenario;
}

/** La regla de la plantilla por tipo de ingreso (H-07): laboral en A, rentas en B, otros solo en C. */
export const DEFAULT_LOSS_BY_KIND: Readonly<Record<IncomeKind, IncomeScenario>> = {
  laboral: 'a',
  renta: 'b',
  otro: 'c',
  pension: 'ninguno',
};

/** Los ingresos por tipo con la regla de la plantilla. @excel Fondo emergencia!C14:C16 */
export function incomeLossesByKind(
  monthlyByKind: Readonly<Record<IncomeKind, number>>,
): IncomeLoss[] {
  return (Object.keys(DEFAULT_LOSS_BY_KIND) as IncomeKind[]).map((kind) => ({
    monthly: monthlyByKind[kind],
    lostIn: DEFAULT_LOSS_BY_KIND[kind],
  }));
}

/** ¿Se pierde este ingreso en el escenario? En C (peor caso) se pierde todo lo que no es `ninguno`. */
function lostIn(scenario: EmergencyScenarioId, loss: IncomeScenario): boolean {
  if (loss === 'ninguno') return false;
  return scenario === 'c' || loss === scenario;
}

export interface EmergencyFundInput {
  /** @excel Presupuesto!I89 */
  readonly totalMonthlyExpenses: number;
  /** @excel Presupuesto!I95 */
  readonly essentialMonthly: number;
  /**
   * Ingresos mensuales promedio con el escenario en que se pierde cada uno. Con la regla de la
   * plantilla (`incomeLossesByKind`) son los de `Ingresos!U20:U23`.
   */
  readonly incomes: readonly IncomeLoss[];
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
  const essential = input.essentialMonthly;
  const shortfall = (kept: number) => Math.max(0, essential - kept);

  const kept = (scenario: EmergencyScenarioId) =>
    input.incomes.reduce(
      (sum, income) => (lostIn(scenario, income.lostIn) ? sum : sum + income.monthly),
      0,
    );
  const keptIncome: Record<EmergencyScenarioId, number> = {
    a: kept('a'),
    b: kept('b'),
    c: kept('c'),
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
