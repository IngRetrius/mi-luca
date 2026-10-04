import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { computeInsurance } from './compute-insurance';
import { lifeInsuranceSum } from './life-insurance';

const fx: FxContext = { baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } };

describe('computeInsurance', () => {
  const result = computeInsurance(
    [
      { status: 'si', annualPremiumQuoted: { amount: 500, currency: 'EUR' }, isLife: false },
      {
        status: 'cotizando',
        annualPremiumQuoted: { amount: 1000, currency: 'USD' },
        isLife: true,
      },
      { status: null, annualPremiumQuoted: { amount: 120, currency: 'EUR' }, isLife: false },
      { status: 'no', annualPremiumQuoted: null, isLife: false },
    ],
    fx,
  );

  it('suma solo los seguros que no tiene, en moneda base', () => {
    expect(result.rows.map((row) => row.monthlyCost)).toEqual([0, 75, 10, 0]);
    expect(result.newPremiumsAnnual).toBe(1020);
    expect(result.newPremiumsMonthly).toBe(85);
  });

  it('separa las primas en cotización (H-24) y dice si tiene seguro de vida', () => {
    expect(result.quotingPremiumsAnnual).toBe(900);
    expect(result.lifeStatus).toBe('cotizando');
    expect(computeInsurance([], fx).lifeStatus).toBeNull();
  });
});

describe('lifeInsuranceSum', () => {
  it('deudas más años de gasto menos lo que ya tiene, nunca negativa', () => {
    const input = { debts: 100, annualToCover: 50, supportYears: 10, liquidAndInvestments: 200 };
    expect(lifeInsuranceSum(input).sumInsured).toBe(400);
    expect(lifeInsuranceSum({ ...input, liquidAndInvestments: 1000 }).sumInsured).toBe(0);
  });
});
