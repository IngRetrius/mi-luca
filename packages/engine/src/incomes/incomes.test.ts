import { describe, expect, it } from 'vitest';

import type { MonthFlags } from '@miluca/domain';

import { baseIncome } from './base-income';
import { computeIncomes } from './compute-incomes';

const EVERY_MONTH: MonthFlags = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const NO_JANUARY: MonthFlags = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const fx = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };

describe('computeIncomes', () => {
  it('convierte a moneda base, cuenta los pagos y suma por mes y por tipo', () => {
    const result = computeIncomes(
      [
        {
          kind: 'laboral',
          monthlyAmount: { amount: 5_000_000, currency: 'COP' },
          paymentsByMonth: NO_JANUARY,
        },
        {
          kind: 'renta',
          monthlyAmount: { amount: 500, currency: 'USD' },
          paymentsByMonth: EVERY_MONTH,
        },
      ],
      fx,
    );
    expect(result.rows[0]).toEqual({
      monthlyBase: 5_000_000,
      paymentsPerYear: 11,
      annual: 55_000_000,
      monthlyAverage: 55_000_000 / 12,
    });
    expect(result.rows[1]?.monthlyBase).toBe(2_000_000);
    expect(result.byMonth[0]).toBe(2_000_000);
    expect(result.byMonth[1]).toBe(7_000_000);
    expect(result.annual).toBe(79_000_000);
    expect(result.annualByKind).toEqual({
      laboral: 55_000_000,
      renta: 24_000_000,
      pension: 0,
      otro: 0,
    });
    expect(result.annualForeignByCurrency).toEqual({ USD: 6_000 });
  });

  it('un ingreso sin tipo suma al total pero no al clasificado', () => {
    const result = computeIncomes(
      [
        {
          kind: null,
          monthlyAmount: { amount: 100, currency: 'COP' },
          paymentsByMonth: EVERY_MONTH,
        },
      ],
      fx,
    );
    expect(result.annual).toBe(1_200);
    expect(result.annualClassified).toBe(0);
  });

  it('sin tasa, un ingreso en otra moneda vale 0 en moneda base, como en la plantilla', () => {
    const result = computeIncomes(
      [
        {
          kind: 'otro',
          monthlyAmount: { amount: 300, currency: 'EUR' },
          paymentsByMonth: EVERY_MONTH,
        },
      ],
      fx,
    );
    expect(result.annual).toBe(0);
    expect(result.annualForeignByCurrency).toEqual({ EUR: 3_600 });
  });
});

describe('baseIncome', () => {
  it('sin valores no sugiere nada', () => {
    expect(baseIncome(Array(12).fill(null))).toEqual({
      average: null,
      lowestThreeAverage: null,
      suggested: null,
    });
  });

  it('con menos de 3 meses hay promedio, pero no ingreso sugerido', () => {
    expect(baseIncome([100, 200, null])).toEqual({
      average: 150,
      lowestThreeAverage: null,
      suggested: null,
    });
  });

  it('sugiere el menor entre el promedio y el promedio de los 3 meses más bajos', () => {
    const history = [3, 1, 2, 10, 10, 10, null, 10, 10, 10, 10, 10];
    const result = baseIncome(history);
    expect(result.average).toBeCloseTo(86 / 11, 12);
    expect(result.lowestThreeAverage).toBe(2);
    expect(result.suggested).toBe(2);
  });
});
