import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { classifyDebts } from './classify';
import type { DebtInput } from './debt-totals';
import { debtPlanStart, expensiveDebtPayoff, simulateDebts } from './simulate';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };

function debt(
  balance: number,
  annualRate: number,
  minPayment: number,
  extra: Partial<DebtInput> = {},
): DebtInput {
  return {
    balance: { amount: balance, currency: 'COP' },
    minPayment: { amount: minPayment, currency: 'COP' },
    annualRate,
    acceptsExtra: true,
    extraFrom: null,
    manualOrder: null,
    ...extra,
  };
}

const plan = { startMonth: '2026-10-01', extraMonthly: 0, lumpSum: 0, horizonMonths: 120 } as const;

describe('classifyDebts', () => {
  const debts = [debt(5_000_000, 0.15, 200_000), debt(1_000_000, 0.3, 100_000), debt(0, 0.5, 0)];

  it('avalancha por tasa y bola de nieve por saldo; sin saldo no entra al orden', () => {
    expect(classifyDebts(debts, 'avalancha', fx).order).toEqual([2, 1, null]);
    expect(classifyDebts(debts, 'bola_de_nieve', fx).order).toEqual([2, 1, null]);
    const byBalance = [debt(5_000_000, 0.3, 1), debt(1_000_000, 0.15, 1)];
    expect(classifyDebts(byBalance, 'bola_de_nieve', fx).order).toEqual([2, 1]);
    expect(classifyDebts(byBalance, 'avalancha', fx).order).toEqual([1, 2]);
  });

  it('el orden manual usa el lugar del asesor; sin lugar va al final, en el orden de la lista', () => {
    const manual = [
      debt(5_000_000, 0.15, 1),
      debt(1_000_000, 0.3, 1, { manualOrder: 2 }),
      debt(2_000_000, 0.2, 1, { manualOrder: 1 }),
      debt(3_000_000, 0.1, 1),
    ];
    const result = classifyDebts(manual, 'manual', fx);
    expect(result.order).toEqual([3, 2, 1, 4]);
    expect(result.byOrder).toEqual([2, 1, 0, 3]);
  });

  it('convierte el saldo a la moneda base antes de comparar', () => {
    const mixed = [
      debt(2_000_000, 0.2, 1),
      { ...debt(0, 0.2, 1), balance: { amount: 400, currency: 'USD' } },
    ];
    expect(classifyDebts(mixed, 'bola_de_nieve', fx).order).toEqual([2, 1]);
  });
});

describe('simulateDebts', () => {
  it('sin deudas no hay filas y el ahorro en intereses es 0', () => {
    const result = simulateDebts([], classifyDebts([], 'avalancha', fx), plan, fx);
    expect(result.byOrder).toEqual([]);
    expect(result.interestSavings).toBe(0);
    expect(result.months).toHaveLength(120);
  });

  it('tasa 0 y sin abonos: termina en saldo / cuota meses', () => {
    const debts = [debt(1_000_000, 0, 250_000, { acceptsExtra: false })];
    const result = simulateDebts(debts, classifyDebts(debts, 'avalancha', fx), plan, fx);
    expect(result.debts[0]).toMatchObject({
      monthsToPayoff: 4,
      payoffDate: '2027-01-01',
      interestWithPlan: 0,
    });
  });

  it('el horizonte es un parámetro: lo que pasa de 120 meses termina dentro de 360', () => {
    const debts = [debt(100_000_000, 0.12, 1_200_000)];
    const classification = classifyDebts(debts, 'avalancha', fx);
    const short = simulateDebts(debts, classification, plan, fx);
    expect(short.debts[0]).toMatchObject({
      exceedsHorizon: true,
      monthsToPayoff: null,
      payoffDate: null,
    });
    expect(short.interestSavings).toBeNull();
    const long = simulateDebts(debts, classification, { ...plan, horizonMonths: 360 }, fx);
    expect(long.debts[0]!.exceedsHorizon).toBe(false);
    expect(long.debts[0]!.monthsToPayoff).toBeGreaterThan(120);
    expect(long.months).toHaveLength(360);
  });

  it('la cuota de una deuda que termina pasa a la siguiente (RN-093)', () => {
    const debts = [debt(300_000, 0, 100_000), debt(2_000_000, 0, 100_000)];
    const result = simulateDebts(debts, classifyDebts(debts, 'bola_de_nieve', fx), plan, fx);
    const second = result.byOrder[1]!;
    expect(second.minimum[3]).toBe(100_000);
    expect(second.extra[3]).toBe(100_000);
  });
});

describe('debtPlanStart y expensiveDebtPayoff', () => {
  it('el plan empieza el primer día del mes siguiente al corte', () => {
    expect(debtPlanStart('2026-09-28')).toBe('2026-10-01');
    expect(debtPlanStart('2026-12-31')).toBe('2027-01-01');
  });

  it('la salida de la deuda cara es la última fecha entre las caras; null sin deuda cara', () => {
    const debts = [
      debt(1_000_000, 0, 500_000),
      debt(3_000_000, 0, 500_000),
      debt(9_000_000, 0, 500_000),
    ];
    const result = simulateDebts(debts, classifyDebts(debts, 'bola_de_nieve', fx), plan, fx);
    expect(expensiveDebtPayoff([true, true, false], result)).toEqual({
      date: result.debts[1]!.payoffDate,
      exceedsHorizon: false,
    });
    expect(expensiveDebtPayoff([false, false, false], result)).toBeNull();
  });
});
