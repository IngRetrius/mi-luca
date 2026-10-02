import { describe, expect, it } from 'vitest';

import { parseRealityCheck } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseRealityCheck', () => {
  it('guarda los tres datos; uno vacío queda null (la prueba sigue pendiente)', () => {
    const parsed = parseRealityCheck(
      form({ savingsAgo: '10.000.000', months: '6', savingsToday: '', currency: 'COP' }),
      { currencies: ['COP'] },
    );
    expect(parsed.ok && parsed.record).toEqual({
      currency: 'COP',
      savings_n_ago: 10_000_000,
      n_months: 6,
      savings_today: null,
    });
  });

  it('N va de 1 a 120 meses', () => {
    for (const months of ['0', '121', '2,5']) {
      const parsed = parseRealityCheck(form({ months, currency: 'COP' }), { currencies: ['COP'] });
      expect(!parsed.ok && parsed.errors.months).toBe('invalidMonths');
    }
  });
});
