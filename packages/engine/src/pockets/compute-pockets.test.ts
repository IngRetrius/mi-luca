import { describe, expect, it } from 'vitest';

import { computeBudget, type BudgetItemInput } from '../budget';
import type { FxContext } from '../currency';
import { computePockets, type PocketsInput } from './compute-pockets';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 4_000 } };
const item = (amount: number, pocket: string | null): BudgetItemInput => ({
  amount: { amount, currency: 'COP' },
  frequency: 'anual',
  durationDays: null,
  expenseType: 'bolsillo',
  essential: false,
  payer: 'cliente',
  basicAmount: null,
  isTemporary: false,
  pocket,
});

function input(overrides: Partial<PocketsInput>): PocketsInput {
  const budgetItems = [item(1_200, 'viajes'), item(600, 'viajes'), item(2_400, null)];
  return {
    pockets: [
      { key: 'viajes', initialBalance: { amount: 1, currency: 'USD' } },
      { key: 'ropa', initialBalance: null },
    ],
    budgetItems,
    budget: computeBudget(budgetItems, 12, fx),
    emergencyCurrentGoal: 10_000,
    noIncomeShortfall: 3_000,
    noIncomeContribution: 250,
    liquidAssets: 20_000,
    operatingCushion: 1_000,
    hasExpensiveDebt: false,
    pctToDebt: 0.9,
    pctExcessToInvestment: 0.5,
    ...overrides,
  };
}

describe('computePockets', () => {
  it('reparte lo disponible: fondo, meses sin ingreso, saldos escritos y el excedente', () => {
    const result = computePockets(input({}), fx);
    expect(result.available).toBe(19_000);
    expect(result.emergency).toEqual({
      annualGoal: 10_000,
      monthlyContribution: 0,
      balance: 10_000,
    });
    expect(result.noIncome.balance).toBe(3_000);
    // El saldo inicial en dólares pasa a pesos con la tasa del cliente.
    expect(result.general[0]).toEqual({
      annualGoal: 1_800,
      monthlyContribution: 150,
      balance: 4_000,
    });
    expect(result.general[1]).toEqual({ annualGoal: 0, monthlyContribution: 0, balance: 0 });
    expect(result.excess).toBe(2_000);
    expect(result.lumpSumToInvestment).toBe(1_000);
    expect(result.unallocated).toBe(1_000);
    expect(result.withContribution).toBe(2);
    expect(result.overAllocated).toBe(false);
  });

  it('si no alcanza, el fondo se llena primero y el aporte lo completa en 12 meses', () => {
    const result = computePockets(input({ liquidAssets: 7_000 }), fx);
    expect(result.emergency.balance).toBe(6_000);
    expect(result.emergency.monthlyContribution).toBe(4_000 / 12);
    expect(result.noIncome.balance).toBe(0);
    expect(result.excess).toBe(-4_000);
    expect(result.overAllocated).toBe(true);
    expect(result.lumpSumToInvestment).toBe(0);
  });

  it('con deuda cara el excedente va a la deuda y no a inversión', () => {
    const result = computePockets(input({ hasExpensiveDebt: true }), fx);
    expect(result.lumpSumToDebt).toBe(1_800);
    expect(result.lumpSumToInvestment).toBe(0);
  });
});
