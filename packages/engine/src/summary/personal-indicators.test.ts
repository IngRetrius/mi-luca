import { describe, expect, it } from 'vitest';

import { computeBudget, type BudgetItemInput } from '../budget';
import { computeIncomes, impliedThirdPartyIncome } from '../incomes';
import { personalIndicators } from './personal-indicators';

const fx = { baseCurrency: 'COP', ratesToBase: {} };
const item = (partial: Partial<BudgetItemInput>): BudgetItemInput => ({
  amount: { amount: 100, currency: 'COP' },
  frequency: 'mensual',
  durationDays: null,
  expenseType: 'directo',
  essential: false,
  payer: 'cliente',
  basicAmount: null,
  isTemporary: false,
  ...partial,
});
const salary = (amount: number) =>
  computeIncomes(
    [
      {
        kind: 'laboral',
        monthlyAmount: { amount, currency: 'COP' },
        paymentsByMonth: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      },
    ],
    fx,
  );

describe('pagador, aporte de terceros e indicadores personales', () => {
  const budget = computeBudget(
    [
      item({}),
      item({ payer: 'familia' }),
      item({ payer: 'tercero', expenseType: 'bolsillo' }),
      item({ payer: 'familia', expenseType: 'ahorro' }),
      item({ expenseType: 'ahorro', amount: { amount: 50, currency: 'COP' } }),
    ],
    12,
    fx,
  );

  it('separa los totales por pagador sin cambiar los de la hoja', () => {
    expect(budget.expensesWithoutSavings.annual).toBe(3_600);
    expect(budget.byPayer.cliente.expensesWithoutSavings.annual).toBe(1_200);
    expect(budget.byPayer.cliente.programmedSavings.annual).toBe(600);
    expect(budget.byPayer.familia.expensesWithoutSavings.annual).toBe(1_200);
    expect(budget.byPayer.familia.programmedSavings.annual).toBe(1_200);
    expect(budget.byPayer.tercero.expensesWithoutSavings.annual).toBe(1_200);
  });

  it('el aporte implícito es lo que pagan la familia y otros, también el ahorro', () => {
    const implied = impliedThirdPartyIncome(budget);
    expect(implied.byPayer.familia.annual).toBe(2_400);
    expect(implied.byPayer.tercero.monthly).toBe(100);
    expect(implied.annual).toBe(3_600);
  });

  it('la tasa personal se mide sobre el ingreso propio y el gasto propio', () => {
    const indicators = personalIndicators(salary(400), budget);
    expect(indicators.ownIncome).toBe(4_800);
    expect(indicators.totalIncome).toBe(8_400);
    expect(indicators.ownExpenses).toBe(1_200);
    expect(indicators.ownProgrammedSavings).toBe(600);
    expect(indicators.ownSavingsRate).toBe(0.75);
  });

  it('sin ingreso propio no hay tasa personal', () => {
    expect(personalIndicators(salary(0), budget).ownSavingsRate).toBeNull();
  });
});
