import { describe, expect, it } from 'vitest';

import type { FxContext } from '../currency';
import { debtTotals } from './debt-totals';

const fx: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 4000 } };

describe('debtTotals', () => {
  it('suma saldos y cuotas en moneda base; una cuota sin escribir no suma', () => {
    const totals = debtTotals(
      [
        { balance: { amount: 1000, currency: 'USD' }, minPayment: { amount: 50, currency: 'USD' } },
        { balance: { amount: 2_000_000, currency: 'COP' }, minPayment: null },
      ],
      fx,
    );
    expect(totals).toEqual({ balance: 6_000_000, minPayment: 200_000 });
  });
});
