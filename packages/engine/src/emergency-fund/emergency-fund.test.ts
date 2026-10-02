import { describe, expect, it } from 'vitest';

import { emergencyFund, incomeLossesByKind } from './emergency-fund';

const base = {
  totalMonthlyExpenses: 3_000,
  essentialMonthly: 2_000,
  months: 3,
  hasExpensiveDebt: false,
};

describe('emergencyFund', () => {
  it('con la regla de la plantilla: laboral se pierde en A, rentas en B, otros solo en C', () => {
    const fund = emergencyFund({
      ...base,
      incomes: incomeLossesByKind({ laboral: 1_000, renta: 500, pension: 300, otro: 200 }),
    });
    expect(fund.scenarios.a.keptIncome).toBe(1_000);
    expect(fund.scenarios.b.keptIncome).toBe(1_500);
    expect(fund.scenarios.c.keptIncome).toBe(300);
    expect(fund.worstCaseGoal).toBe(3 * 1_700);
  });

  it('un ingreso que se mantiene siempre (H-07) baja la meta del peor caso', () => {
    const fund = emergencyFund({
      ...base,
      incomes: [
        { monthly: 1_000, lostIn: 'a' },
        { monthly: 800, lostIn: 'ninguno' }, // por ejemplo, el aporte fijo de un familiar
      ],
    });
    expect(fund.scenarios.c.keptIncome).toBe(800);
    expect(fund.worstCaseGoal).toBe(3 * 1_200);
  });

  it('con deuda cara la meta vigente es un mes de lo esencial', () => {
    const fund = emergencyFund({ ...base, hasExpensiveDebt: true, incomes: [] });
    expect(fund.fullGoal).toBe(6_000);
    expect(fund.currentGoal).toBe(2_000);
  });
});
