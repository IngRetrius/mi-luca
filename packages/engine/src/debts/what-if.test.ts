import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { classifyDebts } from './classify';
import type { DebtInput } from './debt-totals';
import { simulateDebts } from './simulate';
import { debtWhatIf } from './what-if';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: {} };

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

const plan = {
  startMonth: '2026-10-01',
  extraMonthly: 100_000,
  lumpSum: 0,
  horizonMonths: 120,
} as const;

describe('debtWhatIf', () => {
  const debts = [
    debt(6_000_000, 0.28, 300_000),
    debt(20_000_000, 0.15, 600_000),
    debt(5_000_000, 0, 250_000, { acceptsExtra: false }),
  ];
  const classification = classifyDebts(debts, 'avalancha', fx);

  it('sin pago adicional, el escenario es el plan y no se ahorra nada', () => {
    const result = debtWhatIf(
      debts,
      classification,
      plan,
      { monthly: 0, lumpSum: 0 },
      [true, false, false],
      fx,
    );
    expect(result.base).toEqual(simulateDebts(debts, classification, plan, fx));
    expect(result.scenario).toEqual(result.base);
    expect(result.interestSaved).toBe(0);
    expect(result.monthsSaved).toBe(0);
  });

  it('un extra al mes adelanta la salida y ahorra intereses, por el orden de pago', () => {
    const result = debtWhatIf(
      debts,
      classification,
      plan,
      { monthly: 500_000, lumpSum: 0 },
      [true, false, false],
      fx,
    );
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.rows.map((row) => row.debtIndex)).toEqual([0, 1, 2]);
    const card = result.rows[0]!;
    expect(card.monthsSaved).toBeGreaterThan(0);
    expect(card.interestSaved).toBeGreaterThan(0);
    // El préstamo que no acepta abonos sale igual, con sus cuotas.
    const family = result.rows[2]!;
    expect(family.payoffDate).toBe(family.basePayoffDate);
    expect(result.expensivePayoff?.date).toBe(card.payoffDate);
  });

  it('un abono único adicional va primero a la deuda que la recibe en el orden', () => {
    const result = debtWhatIf(
      debts,
      classification,
      plan,
      { monthly: 0, lumpSum: 6_000_000 },
      [true, false, false],
      fx,
    );
    expect(result.rows[0]).toMatchObject({ payoffDate: '2026-10-01', exceedsHorizon: false });
  });

  it('un valor negativo no resta del plan', () => {
    const result = debtWhatIf(debts, classification, plan, { monthly: -1, lumpSum: -1 }, [], fx);
    expect(result.scenario).toEqual(result.base);
  });

  it('si en el plan alguna pasa del horizonte, los meses ganados no se saben y el ahorro es un mínimo', () => {
    const long = [debt(150_000_000, 0.12, 1_400_000)];
    const result = debtWhatIf(
      long,
      classifyDebts(long, 'avalancha', fx),
      { ...plan, extraMonthly: 0 },
      { monthly: 1_000_000, lumpSum: 0 },
      [],
      fx,
    );
    expect(result.baseFreedom).toEqual({ date: null, exceedsHorizon: true });
    expect(result.freedom.exceedsHorizon).toBe(false);
    expect(result.monthsSaved).toBeNull();
    expect(result.rows[0]!.monthsSaved).toBeNull();
    expect(result.interestSavedIsMinimum).toBe(true);
  });
});
