import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { computeInsurance } from './compute-insurance';

const fx: FxContext = { baseCurrency: 'EUR', ratesToBase: { USD: 0.9 } };

describe('computeInsurance', () => {
  it('suma solo los seguros que no tiene, en moneda base', () => {
    const result = computeInsurance(
      [
        { status: 'si', annualPremiumQuoted: { amount: 500, currency: 'EUR' } },
        { status: 'cotizando', annualPremiumQuoted: { amount: 1000, currency: 'USD' } },
        { status: null, annualPremiumQuoted: { amount: 120, currency: 'EUR' } },
        { status: 'no', annualPremiumQuoted: null },
      ],
      fx,
    );
    expect(result.rows.map((row) => row.monthlyCost)).toEqual([0, 75, 10, 0]);
    expect(result.newPremiumsAnnual).toBe(1020);
    expect(result.newPremiumsMonthly).toBe(85);
  });
});
