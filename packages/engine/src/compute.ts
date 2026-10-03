import type { DebtMethod, IncomeScenario, IsoDate, Money, MonthFlags } from '@miluca/domain';

import { automaticRows, computeBudget, type BudgetItemInput, type BudgetResult } from './budget';
import {
  monthlyFlow,
  noIncomeMonths,
  surplusDestination,
  thirdPartyByMonth,
  type MonthlyFlow,
  type NoIncomeMonths,
  type SurplusDestination,
} from './cashflow';
import {
  computeCostOfLiving,
  type CostOfLivingResult,
  type FiscalThreshold,
} from './cost-of-living';
import { toBaseCompat, type FxContext } from './currency';
import {
  classifyDebts,
  debtLoad,
  debtPlanStart,
  debtTotals,
  DIAGNOSIS_HORIZON_MONTHS,
  expensiveDebt,
  expensiveDebtPayoff,
  simulateDebts,
  type DebtClassification,
  type DebtInput,
  type DebtSimulation,
  type DebtTotals,
  type ExpensiveDebt,
  type ExpensiveDebtPayoff,
} from './debts';
import {
  DEFAULT_LOSS_BY_KIND,
  emergencyFund,
  emergencyProgress,
  type EmergencyFund,
  type EmergencyProgress,
} from './emergency-fund';
import { parseIsoDate } from './excel';
import { computeGoals, type GoalInput, type GoalsResult } from './goals';
import {
  computeIncomes,
  impliedThirdPartyIncome,
  socialSecurityPayments,
  type IncomeInput,
  type IncomesResult,
} from './incomes';
import { computeInsurance, type InsuranceInput, type InsuranceResult } from './insurance';
import { liquidAssets, type AssetInput } from './net-worth';
import { computePockets, type PocketInput, type PocketsResult } from './pockets';
import {
  realityCheck,
  type RealityCheck,
  type RealityCheckInput,
  type RealityCheckStatus,
} from './reality-check';
import { computeReceivables, type ReceivableInput, type ReceivablesResult } from './receivables';
import { sequentialSavingsPlan, type SequentialSavingsPlan } from './savings-plan';
import { personalIndicators, type PersonalIndicators } from './summary';
import { ENGINE_VERSION } from './version';

/** compatible = plantilla 2.2 tal cual; nativo = con las correcciones aprobadas (ADR 0007). */
export type EngineMode = 'compatible' | 'native';

/**
 * Parámetros del plan ya resueltos para el caso: el valor que fijó el asesor o, si no, el vigente
 * de la metodología en la fecha de corte.
 */
export interface PlanParameters {
  /** Meses de fondo efectivos. @excel Supuestos!C21 */
  readonly emergencyMonths: number;
  /** Tasa efectiva anual desde la que una deuda es cara. @excel Supuestos!C22 */
  readonly expensiveDebtThreshold: number;
  /** % del sobrante a inversión con la prueba de realidad confirmada. @excel Supuestos!C23 */
  readonly pctInvestConfirmed: number;
  /** % del sobrante a inversión mientras no se confirma. @excel Supuestos!C24 */
  readonly pctInvestPending: number;
  /** % del sobrante a deudas si hay deuda cara. @excel Supuestos!C25 */
  readonly pctSurplusToDebt: number;
  /** % del excedente del saldo actual a inversión. @excel Supuestos!C26 */
  readonly pctExcessToInvestment: number;
  /** Dinero que se queda en la cuenta operativa. @excel Supuestos!C32 */
  readonly operatingCushion: Money;
}

/** Las entradas vivas de un cliente, ya en tipos del motor (04-motor, sección 2). */
export interface CaseInput {
  readonly cutoffDate: IsoDate;
  /** Año que se proyecta mes a mes; null es el año siguiente al de corte. @excel Supuestos!C14 */
  readonly flowYear: number | null;
  readonly fx: FxContext;
  readonly parameters: PlanParameters;
  readonly incomes: readonly IncomeInput[];
  /** Meses en que se paga seguridad social. @excel Ingresos!G17:R17 */
  readonly socialSecurityMonths: MonthFlags;
  /** Partidas del cliente, sin las filas automáticas: esas las arma el motor (RN-028). */
  readonly budgetItems: readonly BudgetItemInput[];
  readonly goals: readonly GoalInput[];
  readonly insurances: readonly InsuranceInput[];
  /** Bolsillo de las primas de seguros nuevos. @excel Presupuesto!K7 */
  readonly insurancePocket: string | null;
  readonly debts: readonly DebtInput[];
  /** Orden de pago de las deudas. @excel Deudas!C6 */
  readonly debtMethod: DebtMethod;
  readonly receivables: readonly ReceivableInput[];
  readonly realityCheck: RealityCheckInput;
  readonly assets: readonly AssetInput[];
  /** Bolsillos generales, en orden. */
  readonly pockets: readonly PocketInput[];
  /** Umbrales fiscales que el asesor marcó como aplicables a este cliente. */
  readonly fiscalThresholds: readonly FiscalThreshold[];
}

export interface ComputeOptions {
  readonly mode: EngineMode;
}

/** Cifras del Resumen. Importes anuales en moneda base, salvo los marcados como mensuales. */
export interface SummaryFigures {
  /** En modo nativo incluye el aporte implícito de terceros (ADR 0010). @excel Resumen!C11 */
  readonly annualIncome: number;
  /** @excel Resumen!C12 */
  readonly annualExpenses: number;
  /** @excel Resumen!C13 */
  readonly programmedSavings: number;
  /** Sobrante del flujo anual, después de gastos, bolsillos y ahorro programado. @excel Resumen!C14 */
  readonly annualSurplus: number;
  /** (Ahorro programado + sobrante) / ingreso; null sin ingreso. @excel Resumen!C15 */
  readonly savingsRate: number | null;
  /** Cuotas / ingreso mensual; null sin ingreso. @excel Resumen!C16 */
  readonly debtLoad: number | null;
  /** @excel Resumen!C17 */
  readonly totalDebt: number;
  /** @excel Resumen!C18 */
  readonly hasExpensiveDebt: boolean;
  /** Mes en que termina la última deuda cara; null sin deuda cara. @excel Resumen!C19 */
  readonly expensiveDebtPayoff: ExpensiveDebtPayoff | null;
  /** Meses de gasto esencial que cubre el saldo líquido; null sin gasto esencial. @excel Resumen!C20 */
  readonly liquidityMonths: number | null;
  /** @excel Resumen!C21 */
  readonly emergencyCurrentGoal: number;
  /** @excel Resumen!C22 */
  readonly emergencyProgress: number;
  /** @excel Resumen!C23 */
  readonly noIncomeShortfall: number;
  /** Aporte mensual al bolsillo de meses sin ingreso (el igual). @excel Resumen!C24 */
  readonly noIncomeMonthlyContribution: number;
  /** Sobrante y abonos de cobros a inversión en el año del flujo. @excel Resumen!C25 */
  readonly annualInvestment: number;
  /** Del excedente del saldo actual. @excel Resumen!C26 */
  readonly lumpSumInvestment: number;
  /** @excel Resumen!C35 */
  readonly realityCheck: RealityCheckStatus;
}

export interface CashflowResult {
  readonly year: number;
  readonly flow: MonthlyFlow;
  readonly noIncome: NoIncomeMonths;
  readonly destination: SurplusDestination;
}

export interface CaseResult {
  readonly engineVersion: string;
  readonly mode: EngineMode;
  readonly incomes: IncomesResult;
  readonly socialSecurityPayments: number;
  readonly goals: GoalsResult;
  readonly insurance: InsuranceResult;
  readonly debts: DebtTotals;
  readonly expensiveDebt: ExpensiveDebt;
  /** Plan de pago de deudas: orden y simulación mes a mes con el extra del flujo y el abono único. */
  readonly debtPlan: {
    readonly classification: DebtClassification;
    readonly simulation: DebtSimulation;
  };
  /** Las partidas con que se calculó el presupuesto: primero las automáticas. */
  readonly budgetItems: readonly BudgetItemInput[];
  readonly budget: BudgetResult;
  readonly costOfLiving: CostOfLivingResult;
  readonly receivables: ReceivablesResult;
  readonly cashflow: CashflowResult;
  readonly realityCheck: RealityCheck;
  /** @excel Patrimonio!C33 */
  readonly liquidAssets: number;
  readonly emergencyFund: EmergencyFund;
  readonly pockets: PocketsResult;
  readonly emergencyProgress: EmergencyProgress;
  /** Solo en modo nativo: primero el fondo, luego el reparto (ADR 0008). */
  readonly savingsPlan: SequentialSavingsPlan | null;
  /** Solo en modo nativo: sin pagador por gasto no hay cifras propias. */
  readonly personal: PersonalIndicators | null;
  readonly summary: SummaryFigures;
}

/**
 * Cálculo completo de lo que hay hasta F4, en el orden de la sección 4 de 04-motor: ingresos,
 * deudas, metas y seguros, presupuesto con filas automáticas, costo de vida, cuentas por cobrar,
 * flujo anual, prueba de realidad, destino del sobrante, fondo de emergencia, bolsillos, plan de
 * pago de deudas y Resumen.
 * Puro y determinista: misma entrada, mismo resultado.
 *
 * En modo compatible lo que pagan otros no suma al ingreso (la plantilla pide escribirlo como
 * ingreso); en modo nativo sí, como aporte implícito (RN-015): en el flujo y en los escenarios del
 * fondo es un ingreso tipo "otro" en los meses en que se paga (ADR 0010). También en modo nativo,
 * el sobrante completa primero el fondo de emergencia y luego se reparte (ADR 0008): la inversión
 * del año es menor mientras el fondo no esté completo.
 */
export function compute(input: CaseInput, options: ComputeOptions): CaseResult {
  const { fx, parameters } = input;
  const native = options.mode === 'native';
  const flowYear = input.flowYear ?? parseIsoDate(input.cutoffDate).year + 1;

  const incomes = computeIncomes(input.incomes, fx);
  const ssPayments = socialSecurityPayments(input.socialSecurityMonths);
  const debts = debtTotals(input.debts, fx);
  const expensive = expensiveDebt(input.debts, parameters.expensiveDebtThreshold, fx);
  const goals = computeGoals(input.goals, input.cutoffDate, fx);
  const insurance = computeInsurance(input.insurances, fx);

  const budgetItems = [
    ...automaticRows(
      {
        debtMinPayments: debts.minPayment,
        newInsurancePremiums: insurance.newPremiumsAnnual,
        goalContributions: goals.rows.map((goal) => goal.monthlyContribution),
        goalPockets: input.goals.map((goal) => goal.pocket),
        insurancePocket: input.insurancePocket,
      },
      fx.baseCurrency,
    ),
    ...input.budgetItems,
  ];
  const budget = computeBudget(budgetItems, ssPayments, fx);

  const personal = native ? personalIndicators(incomes, budget) : null;
  const costOfLiving = computeCostOfLiving(budgetItems, budget, fx, {
    thresholds: input.fiscalThresholds,
    ownIncome: incomes.annual,
  });
  const implied = native ? impliedThirdPartyIncome(budget) : null;

  const receivables = computeReceivables(input.receivables, input.cutoffDate, flowYear, fx);
  const flow = monthlyFlow(
    input.incomes,
    incomes,
    budget,
    input.socialSecurityMonths,
    native ? thirdPartyByMonth(budgetItems, budget, input.socialSecurityMonths, fx) : null,
  );
  const noIncome = noIncomeMonths(flow.balance.months);
  const annualSurplus = noIncome.surplus.total;
  const reality = realityCheck(input.realityCheck, annualSurplus, budget.programmedSavings.annual, {
    pctInvestConfirmed: parameters.pctInvestConfirmed,
    pctInvestPending: parameters.pctInvestPending,
  });

  const liquid = liquidAssets(input.assets, fx);
  // Ingresos de los escenarios del fondo: la regla de la plantilla por tipo y, en modo nativo, la
  // marca de cada ingreso (H-07). Lo que pagan terceros es un ingreso "otro" (ADR 0010).
  const lossAnnual = new Map<IncomeScenario, number>();
  input.incomes.forEach((income, index) => {
    if (income.kind === null) return; // sin tipo no entra a los escenarios, como en la plantilla
    const lost = (native ? income.lostInScenario : null) ?? DEFAULT_LOSS_BY_KIND[income.kind];
    lossAnnual.set(lost, (lossAnnual.get(lost) ?? 0) + (incomes.rows[index]?.annual ?? 0));
  });
  const incomeLosses = [...lossAnnual].map(([lostIn, annual]) => ({
    lostIn,
    monthly: annual / 12,
  }));
  if (implied) incomeLosses.push({ lostIn: 'c', monthly: implied.monthly });
  const fund = emergencyFund({
    totalMonthlyExpenses: budget.expensesWithoutSavings.monthly,
    essentialMonthly: budget.essential.monthly,
    incomes: incomeLosses,
    months: parameters.emergencyMonths,
    hasExpensiveDebt: expensive.exists,
  });
  const pockets = computePockets(
    {
      pockets: input.pockets,
      budgetItems,
      budget,
      emergencyCurrentGoal: fund.currentGoal,
      noIncomeShortfall: noIncome.shortfall,
      noIncomeContribution: noIncome.equalContribution,
      liquidAssets: liquid,
      operatingCushion: toBaseCompat(parameters.operatingCushion, fx),
      hasExpensiveDebt: expensive.exists,
      pctToDebt: parameters.pctSurplusToDebt,
      pctExcessToInvestment: parameters.pctExcessToInvestment,
    },
    fx,
  );
  const progress = emergencyProgress(pockets.emergency.balance, fund);

  // En modo nativo el sobrante completa primero el fondo; se reparte lo que queda (ADR 0008).
  const savingsPlan = native
    ? sequentialSavingsPlan(
        noIncome.surplus.months,
        fund.currentGoal,
        pockets.emergency.balance,
        flowYear,
        input.cutoffDate,
      )
    : null;
  const destination = surplusDestination({
    surplus: savingsPlan?.afterFund ?? noIncome.surplus.months,
    hasExpensiveDebt: expensive.exists,
    pctToDebt: parameters.pctSurplusToDebt,
    pctToInvestment: reality.pctToInvestment,
    receivables: receivables.payments,
  });

  // El extra mensual es el promedio de lo que el flujo manda a deudas en el año (H-04).
  const classification = classifyDebts(input.debts, input.debtMethod, fx);
  const simulation = simulateDebts(
    input.debts,
    classification,
    {
      startMonth: debtPlanStart(input.cutoffDate),
      extraMonthly: destination.totalExtraToDebt.total / 12,
      lumpSum: pockets.lumpSumToDebt,
      horizonMonths: DIAGNOSIS_HORIZON_MONTHS,
    },
    fx,
  );

  const annualIncome = incomes.annual + (implied?.annual ?? 0);
  const annualExpenses = budget.expensesWithoutSavings.annual;
  const programmedSavings = budget.programmedSavings.annual;
  const essentialMonthly = budget.essential.monthly;

  return {
    engineVersion: ENGINE_VERSION,
    mode: options.mode,
    incomes,
    socialSecurityPayments: ssPayments,
    goals,
    insurance,
    debts,
    expensiveDebt: expensive,
    debtPlan: { classification, simulation },
    budgetItems,
    budget,
    costOfLiving,
    receivables,
    cashflow: { year: flowYear, flow, noIncome, destination },
    realityCheck: reality,
    liquidAssets: liquid,
    emergencyFund: fund,
    pockets,
    emergencyProgress: progress,
    savingsPlan,
    personal,
    summary: {
      annualIncome,
      annualExpenses,
      programmedSavings,
      annualSurplus,
      savingsRate: annualIncome === 0 ? null : (programmedSavings + annualSurplus) / annualIncome,
      debtLoad: debtLoad(debts.minPayment, incomes.monthlyAverage),
      totalDebt: debts.balance,
      hasExpensiveDebt: expensive.exists,
      expensiveDebtPayoff: expensiveDebtPayoff(expensive.rows, simulation),
      liquidityMonths: essentialMonthly === 0 ? null : liquid / essentialMonthly,
      emergencyCurrentGoal: fund.currentGoal,
      emergencyProgress: progress.vsFullGoal,
      noIncomeShortfall: noIncome.shortfall,
      noIncomeMonthlyContribution: noIncome.equalContribution,
      annualInvestment: destination.totalToInvestment.total,
      lumpSumInvestment: pockets.lumpSumToInvestment,
      realityCheck: reality.status,
    },
  };
}
