export { classifyDebts, monthlyRate } from './classify';
export type { DebtClassification } from './classify';
export { debtTotals } from './debt-totals';
export type { DebtInput, DebtTotals } from './debt-totals';
export { debtLoad, expensiveDebt } from './expensive-debt';
export type { ExpensiveDebt } from './expensive-debt';
export {
  DIAGNOSIS_HORIZON_MONTHS,
  debtPlanStart,
  expensiveDebtPayoff,
  simulateDebts,
} from './simulate';
export type {
  DebtPlanInput,
  DebtScheduleRow,
  DebtSimulation,
  ExpensiveDebtPayoff,
  SimulatedDebt,
} from './simulate';
