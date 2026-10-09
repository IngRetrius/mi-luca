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

  it('modo nativo: si el ahorro real pasa del esperado en más de 15 %, pide revisar el presupuesto', () => {
    const native = { twoSided: true };
    // Esperado 100 al mes: hasta 115 se confirma; desde ahí, el presupuesto tiene de más.
    const at115 = realityCheck(
      { savingsMonthsAgo: 0, months: 10, savingsToday: 1_150 },
      1_200,
      0,
      params,
      native,
    );
    expect(at115.status).toBe('confirmada');
    const above = realityCheck(
      { savingsMonthsAgo: 0, months: 10, savingsToday: 1_160 },
      1_200,
      0,
      params,
      native,
    );
    expect(above.status).toBe('revisar_presupuesto');
    expect(above.pctToInvestment).toBe(0.5);
    // La plantilla solo mira hacia abajo.
    expect(
      realityCheck({ savingsMonthsAgo: 0, months: 10, savingsToday: 1_160 }, 1_200, 0, params)
        .status,
    ).toBe('confirmada');
  });

  it('modo nativo: con un plan en déficit y un cliente que sí ahorra, pide revisar el presupuesto', () => {
    // El plan dice -725.000 al mes; el cliente juntó 1.000.000 en 6 meses (+166.667 al mes).
    const result = realityCheck(
      { savingsMonthsAgo: 3_000_000, months: 6, savingsToday: 4_000_000 },
      -8_700_000,
      0,
      params,
      { twoSided: true },
    );
    expect(result.expectedMonthly).toBe(-725_000);
    expect(result.status).toBe('revisar_presupuesto');
    // Un ahorro real cercano al déficit del plan sí lo confirma.
    expect(
      realityCheck(
        { savingsMonthsAgo: 4_300_000, months: 6, savingsToday: 0 },
        -8_700_000,
        0,
        params,
        { twoSided: true },
      ).status,
    ).toBe('confirmada');
  });
});
