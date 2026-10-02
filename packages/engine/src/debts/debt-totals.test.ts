import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { debtTotals } from './debt-totals';
import { debtLoad, expensiveDebt } from './expensive-debt';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };

describe('debtTotals', () => {
  it('suma saldos y cuotas en moneda base; una cuota sin escribir no suma', () => {
    const totals = debtTotals(
      [
        {
          balance: { amount: 1000, currency: 'USD' },
          minPayment: { amount: 50, currency: 'USD' },
          annualRate: 0.3,
        },
        { balance: { amount: 2_000_000, currency: 'COP' }, minPayment: null, annualRate: null },
      ],
      fx,
    );
    expect(totals).toEqual({ balance: 6_000_000, minPayment: 200_000 });
  });
});

describe('expensiveDebt y debtLoad', () => {
  it('marca las deudas con saldo cuya tasa llega al umbral; sin tasa vale 0', () => {
    const result = expensiveDebt(
      [
        { balance: { amount: 1000, currency: 'USD' }, minPayment: null, annualRate: 0.2 },
        { balance: { amount: 2_000_000, currency: 'COP' }, minPayment: null, annualRate: 0.19 },
        { balance: { amount: 0, currency: 'COP' }, minPayment: null, annualRate: 0.5 },
        { balance: { amount: 500_000, currency: 'COP' }, minPayment: null, annualRate: null },
      ],
      0.2,
      fx,
    );
    expect(result).toEqual({ rows: [true, false, null, false], balance: 4_000_000, exists: true });
    expect(expensiveDebt([], 0.2, fx)).toEqual({ rows: [], balance: 0, exists: false });
  });

  it('la carga es cuotas sobre ingreso mensual; sin ingreso, null', () => {
    expect(debtLoad(300, 1000)).toBe(0.3);
    expect(debtLoad(300, 0)).toBeNull();
  });
});
