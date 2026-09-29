import { describe, expect, it } from 'vitest';

import { computeBudget, type BudgetItemInput } from './compute-budget';

const fx = { baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } };
const item = (partial: Partial<BudgetItemInput>): BudgetItemInput => ({
  amount: { amount: 100, currency: 'EUR' },
  frequency: 'mensual',
  durationDays: null,
  expenseType: 'directo',
  essential: false,
  ...partial,
});

describe('computeBudget', () => {
  it('una partida sin frecuencia o sin valor vale 0 y la sin frecuencia cuenta como incompleta', () => {
    const result = computeBudget(
      [item({ frequency: null }), item({ amount: null }), item({ expenseType: null })],
      12,
      fx,
    );
    expect(result.rows.map((row) => row.annual)).toEqual([0, 0, 1_200]);
    expect(result.rows[0]?.timesPerYear).toBeNull();
    expect(result.incompleteRows).toBe(2);
  });

  it('las partidas sin tipo cuentan como gasto, y el ahorro no', () => {
    const result = computeBudget(
      [
        item({ expenseType: null }),
        item({ expenseType: 'ahorro' }),
        item({ expenseType: 'bolsillo' }),
      ],
      12,
      fx,
    );
    expect(result.expensesWithoutSavings.annual).toBe(2_400);
    expect(result.programmedSavings.annual).toBe(1_200);
    expect(result.pockets.monthly).toBe(100);
  });

  it('el gasto esencial excluye el ahorro aunque esté marcado como esencial', () => {
    const result = computeBudget(
      [item({ essential: true }), item({ essential: true, expenseType: 'ahorro' })],
      12,
      fx,
    );
    expect(result.essential.annual).toBe(1_200);
  });

  it('convierte otras monedas con la tasa del cliente', () => {
    const result = computeBudget([item({ amount: { amount: 100, currency: 'USD' } })], 12, fx);
    expect(result.rows[0]?.annual).toBeCloseTo(1_080, 10);
  });

  it('la seguridad social usa los meses de pago y suma su valor por pago', () => {
    const result = computeBudget(
      [
        item({
          frequency: 'meses_seguridad_social',
          expenseType: 'seg_social',
          amount: { amount: 500, currency: 'EUR' },
        }),
      ],
      11,
      fx,
    );
    expect(result.socialSecurity.annual).toBe(5_500);
    expect(result.socialSecurityPerPayment).toBe(500);
  });
});
