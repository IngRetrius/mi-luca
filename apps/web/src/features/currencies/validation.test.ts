import { describe, expect, it } from 'vitest';

import { parseFxRate } from './validation';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const options = {
  baseCurrency: 'COP',
  existing: ['EUR'],
  fixedCurrency: null,
  today: '2026-10-01',
};

describe('parseFxRate', () => {
  it('una tasa válida queda lista para guardar', () => {
    const parsed = parseFxRate(
      form({ currency: 'usd', rate: '3.912,5', asOf: '2026-09-30', note: ' su banco ' }),
      options,
    );
    expect(parsed.ok && parsed.record).toEqual({
      currency: 'USD',
      rate_to_base: 3912.5,
      as_of: '2026-09-30',
      note: 'su banco',
    });
  });

  it('rechaza la moneda base, una repetida y un código que no es de tres letras', () => {
    const check = (currency: string) => {
      const parsed = parseFxRate(form({ currency, rate: '1', asOf: '2026-09-30' }), options);
      return parsed.ok ? null : parsed.errors.currency;
    };
    expect(check('COP')).toBe('isBase');
    expect(check('EUR')).toBe('duplicate');
    expect(check('US')).toBe('invalidCurrency');
  });

  it('al editar, la moneda viene de la ruta y no es un duplicado', () => {
    const parsed = parseFxRate(form({ rate: '0,87', asOf: '2026-09-30' }), {
      ...options,
      fixedCurrency: 'EUR',
    });
    expect(parsed.ok && parsed.record.currency).toBe('EUR');
  });

  it('la tasa es mayor que 0 y la fecha existe y no es futura', () => {
    const parsed = parseFxRate(form({ currency: 'USD', rate: '0', asOf: '2026-02-30' }), options);
    expect(!parsed.ok && parsed.errors).toEqual({ rate: 'invalidRate', asOf: 'invalidDate' });
    const future = parseFxRate(form({ currency: 'USD', rate: '1', asOf: '2026-10-02' }), options);
    expect(!future.ok && future.errors.asOf).toBe('invalidDate');
  });
});
