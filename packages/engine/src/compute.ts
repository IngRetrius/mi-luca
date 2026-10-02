import type { IsoDate, MonthFlags } from '@miluca/domain';

import { automaticRows, computeBudget, type BudgetItemInput, type BudgetResult } from './budget';
import {
  computeCostOfLiving,
  type CostOfLivingResult,
  type FiscalThreshold,
} from './cost-of-living';
import type { FxContext } from './currency';
import { debtTotals, type DebtInput, type DebtTotals } from './debts';
import { computeGoals, type GoalInput, type GoalsResult } from './goals';
import {
  computeIncomes,
  impliedThirdPartyIncome,
  socialSecurityPayments,
  type IncomeInput,
  type IncomesResult,
} from './incomes';
import { computeInsurance, type InsuranceInput, type InsuranceResult } from './insurance';
import { personalIndicators, type PersonalIndicators } from './summary';
import { ENGINE_VERSION } from './version';

/** compatible = plantilla 2.2 tal cual; nativo = con las correcciones aprobadas (ADR 0007). */
export type EngineMode = 'compatible' | 'native';

/** Las entradas vivas de un cliente, ya en tipos del motor (04-motor, sección 2). */
export interface CaseInput {
  readonly cutoffDate: IsoDate;
  readonly fx: FxContext;
  readonly incomes: readonly IncomeInput[];
  /** Meses en que se paga seguridad social. @excel Ingresos!G17:R17 */
  readonly socialSecurityMonths: MonthFlags;
  /** Partidas del cliente, sin las filas automáticas: esas las arma el motor (RN-028). */
  readonly budgetItems: readonly BudgetItemInput[];
  readonly goals: readonly GoalInput[];
  readonly insurances: readonly InsuranceInput[];
  readonly debts: readonly DebtInput[];
  /** Umbrales fiscales que el asesor marcó como aplicables a este cliente. */
  readonly fiscalThresholds: readonly FiscalThreshold[];
}

export interface ComputeOptions {
  readonly mode: EngineMode;
}

/** Primeras cifras del Resumen. Importes anuales en moneda base. */
export interface SummaryFigures {
  /** En modo nativo incluye el aporte implícito de terceros (ADR 0010). @excel Resumen!C11 */
  readonly annualIncome: number;
  /** @excel Resumen!C12 */
  readonly annualExpenses: number;
  /** @excel Resumen!C13 */
  readonly programmedSavings: number;
  /** Ingreso - gasto - ahorro programado (control de calidad de la sección 6). @excel Resumen!C14 */
  readonly annualSurplus: number;
  /** (Ahorro programado + sobrante) / ingreso; null sin ingreso. @excel Resumen!C15 */
  readonly savingsRate: number | null;
}

export interface CaseResult {
  readonly engineVersion: string;
  readonly mode: EngineMode;
  readonly incomes: IncomesResult;
  readonly socialSecurityPayments: number;
  readonly goals: GoalsResult;
  readonly insurance: InsuranceResult;
  readonly debts: DebtTotals;
  /** Las partidas con que se calculó el presupuesto: primero las automáticas. */
  readonly budgetItems: readonly BudgetItemInput[];
  readonly budget: BudgetResult;
  readonly costOfLiving: CostOfLivingResult;
  /** Solo en modo nativo: sin pagador por gasto no hay cifras propias. */
  readonly personal: PersonalIndicators | null;
  readonly summary: SummaryFigures;
}

/**
 * Cálculo completo de lo que hay hasta F2, en el orden de la sección 4 de 04-motor: ingresos,
 * deudas, metas y seguros, presupuesto con filas automáticas, costo de vida y Resumen. Puro y
 * determinista: misma entrada, mismo resultado.
 *
 * En modo compatible lo que pagan otros no suma al ingreso (la plantilla pide escribirlo como
 * ingreso); en modo nativo sí, como aporte implícito (RN-015).
 */
export function compute(input: CaseInput, options: ComputeOptions): CaseResult {
  const { fx } = input;
  const incomes = computeIncomes(input.incomes, fx);
  const ssPayments = socialSecurityPayments(input.socialSecurityMonths);
  const debts = debtTotals(input.debts, fx);
  const goals = computeGoals(input.goals, input.cutoffDate, fx);
  const insurance = computeInsurance(input.insurances, fx);

  const budgetItems = [
    ...automaticRows(
      {
        debtMinPayments: debts.minPayment,
        newInsurancePremiums: insurance.newPremiumsAnnual,
        goalContributions: goals.rows.map((goal) => goal.monthlyContribution),
      },
      fx.baseCurrency,
    ),
    ...input.budgetItems,
  ];
  const budget = computeBudget(budgetItems, ssPayments, fx);

  const native = options.mode === 'native';
  const personal = native ? personalIndicators(incomes, budget) : null;
  const costOfLiving = computeCostOfLiving(budgetItems, budget, fx, {
    thresholds: input.fiscalThresholds,
    ownIncome: incomes.annual,
  });

  const annualIncome = incomes.annual + (native ? impliedThirdPartyIncome(budget).annual : 0);
  const annualExpenses = budget.expensesWithoutSavings.annual;
  const programmedSavings = budget.programmedSavings.annual;
  const annualSurplus = annualIncome - annualExpenses - programmedSavings;

  return {
    engineVersion: ENGINE_VERSION,
    mode: options.mode,
    incomes,
    socialSecurityPayments: ssPayments,
    goals,
    insurance,
    debts,
    budgetItems,
    budget,
    costOfLiving,
    personal,
    summary: {
      annualIncome,
      annualExpenses,
      programmedSavings,
      annualSurplus,
      savingsRate: annualIncome === 0 ? null : (programmedSavings + annualSurplus) / annualIncome,
    },
  };
}
