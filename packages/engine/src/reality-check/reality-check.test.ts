import { describe, expect, it } from 'vitest';

import { realityCheck } from './reality-check';

const params = { pctInvestConfirmed: 0.7, pctInvestPending: 0.5 };

describe('realityCheck', () => {
  it('sin algún dato, o con N igual a 0, queda pendiente con el % menor', () => {
    const pending = realityCheck(
      { savingsMonthsAgo: 100, months: null, savingsToday: 200 },
      1_200,
      0,
      params,
    );
    expect(pending).toMatchObject({ actualMonthly: null, difference: null, status: 'pendiente' });
    expect(pending.pctToInvestment).toBe(0.5);
    expect(
      realityCheck({ savingsMonthsAgo: 100, months: 0, savingsToday: 200 }, 1_200, 0, params)
        .status,
    ).toBe('pendiente');
  });

  it('se confirma desde el 85 % del ahorro esperado; por debajo pide revisar gastos', () => {
    // Esperado: (1.200 + 0) / 12 = 100 al mes.
    const at85 = realityCheck(
      { savingsMonthsAgo: 0, months: 10, savingsToday: 850 },
      1_200,
      0,
      params,
    );
    expect(at85.status).toBe('confirmada');
    expect(at85.pctToInvestment).toBe(0.7);
    const below = realityCheck(
      { savingsMonthsAgo: 0, months: 10, savingsToday: 840 },
      1_200,
      0,
      params,
    );
    expect(below.status).toBe('revisar_gastos');
    expect(below.pctToInvestment).toBe(0.5);
  });

  it('sin ahorro esperado no hay diferencia y queda pendiente', () => {
    const result = realityCheck(
      { savingsMonthsAgo: 0, months: 6, savingsToday: 600 },
      0,
      0,
      params,
    );
    expect(result).toMatchObject({ actualMonthly: 100, difference: null, status: 'pendiente' });
  });
});
