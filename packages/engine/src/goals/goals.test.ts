import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { computeGoals, type GoalInput } from './compute-goals';
import { tripCost, type TripCostInput } from './trip-cost';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };
const cop = (amount: number) => ({ amount, currency: 'COP' });
const CUTOFF = '2026-09-28';

function goal(overrides: Partial<GoalInput>): GoalInput {
  return {
    amount: null,
    trip: null,
    alreadySaved: null,
    repeatEveryYears: null,
    targetDate: null,
    ...overrides,
  };
}

const trip: TripCostInput = {
  currency: 'USD',
  items: [
    { unitValue: 500, quantity: 1, isLodging: false },
    { unitValue: 100, quantity: 4, isLodging: true },
  ],
  lodgingTaxRate: 0.1,
  cushionRate: 0.05,
  baseCurrencyCosts: [200000],
};

describe('computeGoals', () => {
  it('con fecha en el mismo mes reparte en 1 mes, no divide entre 0', () => {
    const [row] = computeGoals(
      [goal({ amount: cop(900), targetDate: '2026-10-15' })],
      CUTOFF,
      fx,
    ).rows;
    expect(row).toEqual({ usedAmount: 900, monthsRemaining: 1, monthlyContribution: 900 });
  });

  it('sin fecha ni repetición no pide aporte', () => {
    const [row] = computeGoals([goal({ amount: cop(900) })], CUTOFF, fx).rows;
    expect(row).toEqual({ usedAmount: 900, monthsRemaining: null, monthlyContribution: 0 });
  });

  it('convierte a moneda base el valor y lo ya ahorrado en otra moneda', () => {
    const [row] = computeGoals(
      [
        goal({
          amount: { amount: 1000, currency: 'USD' },
          alreadySaved: { amount: 250, currency: 'USD' },
          targetDate: '2027-09-28',
        }),
      ],
      CUTOFF,
      fx,
    ).rows;
    expect(row?.usedAmount).toBe(4_000_000);
    expect(row?.monthlyContribution).toBe(250_000);
  });

  it('con calculadora usa el costo del viaje y no el valor escrito', () => {
    const [row] = computeGoals(
      [goal({ amount: cop(1), trip, repeatEveryYears: 2 })],
      CUTOFF,
      fx,
    ).rows;
    expect(row?.usedAmount).toBe(tripCost(trip, fx).total);
    expect(row?.monthlyContribution).toBeCloseTo(row!.usedAmount / 24, 6);
  });
});

describe('tripCost', () => {
  it('cobra impuestos solo sobre el alojamiento y el colchón sobre el subtotal', () => {
    const result = tripCost(trip, fx);
    expect(result.lodgingTax).toBeCloseTo(40, 10);
    expect(result.subtotal).toBeCloseTo(940, 10);
    expect(result.totalForeign).toBeCloseTo(987, 10);
    expect(result.total).toBeCloseTo(987 * 4000 + 200000, 6);
  });

  it('sin tasa de la moneda del viaje solo quedan los gastos en moneda base', () => {
    const result = tripCost({ ...trip, currency: 'EUR' }, fx);
    expect(result.totalForeignInBase).toBe(0);
    expect(result.total).toBe(200000);
  });
});
