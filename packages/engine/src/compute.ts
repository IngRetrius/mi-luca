import type {
  ClientType,
  DebtMethod,
  IncomeScenario,
  IsoDate,
  Money,
  MonthFlags,
  RiskLevel,
} from '@miluca/domain';

import { automaticRows, computeBudget, type BudgetItemInput, type BudgetResult } from './budget';
import {
  monthlyFlow,
  monthValues,
  type MonthValues,
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
import { creditBridge, creditSchedule, type CreditSchedule } from './credits';
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
import { datedifYears, monthIndex, parseIsoDate } from './excel';
import { computeGoals, type GoalInput, type GoalsResult } from './goals';
import {
  computeIncomes,
  impliedThirdPartyIncome,
  socialSecurityPayments,
  type IncomeInput,
  type IncomesResult,
} from './incomes';
import {
  computeInsurance,
  DEFAULT_SUPPORT_YEARS,
  lifeInsuranceSum,
  type InsuranceInput,
  type InsuranceResult,
  type LifeInsuranceSum,
} from './insurance';
import {
  currentInvestments,
  growthAllocation,
  investmentPlan,
  projection,
  PROJECTION_YEARS,
  riskProfile,
  type CurrentInvestments,
  type GrowthAllocation,
  type GrowthRangeBand,
  type InvestmentInput,
  type InvestmentPlan,
  type ProjectionParameters,
  type ProjectionYear,
  type RiskAnswers,
  type RiskProfile,
} from './investment';
import { computeNetWorth, liquidAssets, type AssetInput, type NetWorth } from './net-worth';
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
  /**
   * Edad de retiro esperada. La plantilla usa la edad de pensión por sexo; aquí llega resuelta
   * (parámetro del país o valor del asesor). @excel Supuestos!C29
   */
  readonly retirementAge: number;
  /** Rendimientos reales supuestos, bajada cerca del retiro y piso. @excel Supuestos!C27:C28, C30:C31 */
  readonly projection: ProjectionParameters;
  /** Rango en crecimiento por edad y perfil (RN-114). @excel Inversión!B36:I39 */
  readonly growthRanges: readonly GrowthRangeBand[];
}

/** Datos de la persona que usa el cálculo; sin nombre ni documento. */
export interface CaseProfile {
  /** @excel Supuestos!C8 */
  readonly birthDate: IsoDate | null;
  /** Personas a cargo. @excel Supuestos!C11 */
  readonly dependents: number;
  /** @excel Supuestos!C10 */
  readonly clientType: ClientType | null;
}

/** Perfil de riesgo: respuestas del cliente y criterio del asesor. */
export interface RiskProfileInput {
  readonly answers: RiskAnswers;
  /**
   * Condiciones de capacidad que la plantilla deja cambiar (`Inversión!C25:C26`); null es la
   * sugerida (por tipo de cliente y por personas a cargo sin seguro de vida, H-16).
   */
  readonly variableIncome: boolean | null;
  readonly dependentsWithoutLifeInsurance: boolean | null;
  /** 0 es el mínimo del rango y 1 el máximo. @excel Inversión!C44 */
  readonly rangePosition: number;
}

/** Datos del asesor para la suma asegurada de vida; solo cuentan en modo nativo (H-10). */
export interface LifeInsuranceSettings {
  /** Null: 10 años si hay personas a cargo, como la plantilla. */
  readonly supportYears: number | null;
  /** Null: el gasto anual del presupuesto. */
  readonly annualToCover: Money | null;
}

/** Las entradas vivas de un cliente, ya en tipos del motor (04-motor, sección 2). */
export interface CaseInput {
  readonly cutoffDate: IsoDate;
  readonly profile: CaseProfile;
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
  readonly lifeInsurance: LifeInsuranceSettings;
  readonly debts: readonly DebtInput[];
  /** Orden de pago de las deudas. @excel Deudas!C6 */
  readonly debtMethod: DebtMethod;
  readonly receivables: readonly ReceivableInput[];
  readonly realityCheck: RealityCheckInput;
  readonly assets: readonly AssetInput[];
  readonly investments: readonly InvestmentInput[];
  readonly riskProfile: RiskProfileInput;
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
  /** @excel Resumen!C27 */
  readonly riskProfile: RiskLevel | null;
  /** @excel Resumen!C28 */
  readonly growthShare: number;
  /** @excel Resumen!C33 */
  readonly netWorth: number;
  /** Inmuebles y vehículos sobre activos. @excel Resumen!C34 */
  readonly concentration: number;
  /** @excel Resumen!C35 */
  readonly realityCheck: RealityCheckStatus;
}

export interface InvestmentResult {
  /** Edad en la fecha de corte; null sin fecha de nacimiento. @excel Supuestos!C13 */
  readonly age: number | null;
  readonly current: CurrentInvestments;
  readonly profile: RiskProfile;
  readonly allocation: GrowthAllocation;
  readonly plan: InvestmentPlan;
  /** @excel Inversión!C71 */
  readonly yearsToRetirement: number;
  /** Ilustrativa, no garantizada (RN-116). */
  readonly projection: readonly ProjectionYear[];
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
  /** @excel Seguros!C20:C24 */
  readonly lifeInsurance: LifeInsuranceSum;
  readonly debts: DebtTotals;
  readonly expensiveDebt: ExpensiveDebt;
  /** Tabla de cada deuda con seguimiento cuota a cuota, en el orden de `debts`; null sin él. */
  readonly creditSchedules: readonly (CreditSchedule | null)[];
  /** Plan de pago de deudas: orden y simulación mes a mes con el extra del flujo y el abono único. */
  readonly debtPlan: {
    /** Las deudas con que se calculó el plan: las de seguimiento, con su saldo y cuota de hoy. */
    readonly debts: readonly DebtInput[];
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
  readonly netWorth: NetWorth;
  readonly investment: InvestmentResult;
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
 * Lo que se paga de cuotas mínimas en cada mes del año del flujo según el plan de pago: lo pagado
 * en el plan ese mes (cuota y extra), sin pasar de la suma de las cuotas. Mientras quede deuda, la
 * cuota de la que termina pasa a la siguiente (RN-093) y no sale del flujo; cuando el plan las
 * salda todas, ese dinero vuelve al sobrante. Antes del primer mes del plan, la cuota completa.
 * (H-03, ADR 0015)
 */
function debtMinimumsByMonth(
  simulation: DebtSimulation,
  minimums: number,
  planStart: IsoDate,
  flowYear: number,
): MonthValues {
  const first = monthIndex(planStart);
  return monthValues((month) => {
    const offset = flowYear * 12 + month + 1 - first;
    if (offset < 0) return minimums;
    const paid = simulation.byOrder.reduce(
      (sum, row) => sum + (row.minimum[offset] ?? 0) + (row.extra[offset] ?? 0),
      0,
    );
    return Math.min(minimums, paid);
  });
}

/**
 * Cálculo completo de lo que hay hasta F5, en el orden de la sección 4 de 04-motor: ingresos,
 * deudas, metas y seguros, presupuesto con filas automáticas, costo de vida, cuentas por cobrar,
 * flujo anual, prueba de realidad, destino del sobrante, fondo de emergencia, bolsillos, plan de
 * pago de deudas, patrimonio, suma asegurada de vida, inversión y Resumen.
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
  // Con seguimiento cuota a cuota, el diagnóstico usa el saldo y la cuota de hoy (puente, Panel 7).
  const creditSchedules = input.debts.map((debt) =>
    debt.tracking
      ? creditSchedule(debt.tracking.credit, debt.tracking.marks, input.cutoffDate)
      : null,
  );
  const debtInputs: DebtInput[] = input.debts.map((debt, index) => {
    const schedule = creditSchedules[index];
    if (!schedule) return debt;
    const bridge = creditBridge(schedule);
    const { currency } = debt.balance;
    return {
      ...debt,
      balance: { amount: bridge.balance, currency },
      minPayment: { amount: bridge.minPayment ?? 0, currency },
      extraFrom: bridge.extraFrom ?? debt.extraFrom,
      // En modo nativo los seguros de la cuota se pagan cada mes sin bajar el saldo (H-05); la
      // hoja Deudas los trata como capital.
      ...(native && debt.tracking!.credit.insurance > 0
        ? { insurance: { amount: debt.tracking!.credit.insurance, currency } }
        : {}),
    };
  });
  const debts = debtTotals(debtInputs, fx);
  const expensive = expensiveDebt(debtInputs, parameters.expensiveDebtThreshold, fx);
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
  const classification = classifyDebts(debtInputs, input.debtMethod, fx);
  const planStart = debtPlanStart(input.cutoffDate);

  // Del flujo al plan de pago. En modo nativo corre dos veces: con el flujo de la plantilla y luego
  // con las cuotas que de verdad se pagan cada mes según ese plan (H-03, ADR 0015).
  const cashflowChain = (
    debtMinimums: { readonly automaticMonthly: number; readonly months: MonthValues } | null,
  ) => {
    const flow = monthlyFlow(
      input.incomes,
      incomes,
      budget,
      input.socialSecurityMonths,
      native ? thirdPartyByMonth(budgetItems, budget, input.socialSecurityMonths, fx) : null,
      debtMinimums,
    );
    const noIncome = noIncomeMonths(flow.balance.months);
    const annualSurplus = noIncome.surplus.total;
    const reality = realityCheck(
      input.realityCheck,
      annualSurplus,
      budget.programmedSavings.annual,
      {
        pctInvestConfirmed: parameters.pctInvestConfirmed,
        pctInvestPending: parameters.pctInvestPending,
      },
    );

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
    const simulation = simulateDebts(
      debtInputs,
      classification,
      {
        startMonth: planStart,
        extraMonthly: destination.totalExtraToDebt.total / 12,
        lumpSum: pockets.lumpSumToDebt,
        horizonMonths: DIAGNOSIS_HORIZON_MONTHS,
      },
      fx,
    );
    return {
      flow,
      noIncome,
      annualSurplus,
      reality,
      pockets,
      progress,
      savingsPlan,
      destination,
      simulation,
    };
  };
  const firstPass = cashflowChain(null);
  const chain =
    native && debtInputs.length > 0
      ? cashflowChain({
          automaticMonthly: debts.minPayment,
          months: debtMinimumsByMonth(firstPass.simulation, debts.minPayment, planStart, flowYear),
        })
      : firstPass;
  const { flow, noIncome, annualSurplus, reality, pockets, progress, savingsPlan, destination } =
    chain;
  const { simulation } = chain;

  // Patrimonio, seguro de vida e inversión (F5).
  const age =
    input.profile.birthDate === null
      ? null
      : datedifYears(input.profile.birthDate, input.cutoffDate);
  const investmentsNow = currentInvestments(input.investments, fx);
  const netWorth = computeNetWorth(
    {
      assets: input.assets,
      investments: investmentsNow.total,
      receivables: receivables.totalPending,
      debts: debts.balance,
    },
    fx,
  );
  const dependents = input.profile.dependents > 0;
  const lifeSettings = native ? input.lifeInsurance : { supportYears: null, annualToCover: null };
  const lifeInsurance = lifeInsuranceSum({
    debts: debts.balance,
    annualToCover:
      lifeSettings.annualToCover === null
        ? budget.expensesWithoutSavings.annual
        : toBaseCompat(lifeSettings.annualToCover, fx),
    supportYears: lifeSettings.supportYears ?? (dependents ? DEFAULT_SUPPORT_YEARS : 0),
    liquidAndInvestments: liquid + investmentsNow.total,
  });

  const { retirementAge } = parameters;
  // La pensión no se analiza en la plataforma (ADR 0016): como la plantilla con la hoja Pensión
  // vacía, no hay brecha y ninguna pensión está asegurada.
  const profile = riskProfile(
    input.riskProfile.answers,
    {
      variableIncome:
        input.riskProfile.variableIncome ?? input.profile.clientType === 'independiente_variable',
      dependentsWithoutLifeInsurance:
        input.riskProfile.dependentsWithoutLifeInsurance ??
        (dependents && insurance.lifeStatus !== 'si'),
      pensionGap: false,
      emergencyFundIncomplete: progress.vsFullGoal < 0.999,
      nearRetirementWithoutPension: age !== null && retirementAge - age < 5,
    },
    expensive.exists,
  );
  const allocation = growthAllocation({
    age,
    finalProfile: profile.final,
    horizon: input.riskProfile.answers.horizon,
    rangePosition: input.riskProfile.rangePosition,
    ranges: parameters.growthRanges,
  });
  const plan = investmentPlan(
    destination.totalToInvestment.total,
    pockets.lumpSumToInvestment,
    investmentsNow,
    allocation.growthShare,
  );
  const yearsToRetirement = age === null ? 0 : Math.max(0, retirementAge - age);
  // Abonos de cobros a inversión de cada año; con deuda cara van a deudas.
  const receivablesByYear = Array.from({ length: PROJECTION_YEARS }, (_, k) =>
    expensive.exists
      ? 0
      : computeReceivables(
          input.receivables,
          input.cutoffDate,
          flowYear + k,
          fx,
        ).payments.forInvestment.reduce((sum, value) => sum + value, 0),
  );
  const investmentProjection = projection({
    firstYear: flowYear,
    birthYear: input.profile.birthDate === null ? null : parseIsoDate(input.profile.birthDate).year,
    yearsToRetirement,
    growthShare: allocation.growthShare,
    startingBalance: plan.target.total,
    annualContribution: destination.toInvestment.total,
    receivablesByYear,
    parameters: parameters.projection,
  });

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
    lifeInsurance,
    debts,
    expensiveDebt: expensive,
    creditSchedules,
    debtPlan: { debts: debtInputs, classification, simulation },
    budgetItems,
    budget,
    costOfLiving,
    receivables,
    cashflow: { year: flowYear, flow, noIncome, destination },
    realityCheck: reality,
    liquidAssets: liquid,
    netWorth,
    investment: {
      age,
      current: investmentsNow,
      profile,
      allocation,
      plan,
      yearsToRetirement,
      projection: investmentProjection,
    },
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
      riskProfile: profile.finalLevel,
      growthShare: allocation.growthShare,
      netWorth: netWorth.netWorth,
      concentration: netWorth.concentration,
      realityCheck: reality.status,
    },
  };
}
