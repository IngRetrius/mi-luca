import { describe, expect, it } from 'vitest';

import { parsePlanSettings } from './plan-settings-validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parsePlanSettings', () => {
  it('vacío es la metodología y el colchón es 0', () => {
    const parsed = parsePlanSettings(form({}));
    expect(parsed.ok && parsed.record).toEqual({
      emergency_months_override: null,
      expensive_debt_threshold: null,
      pct_surplus_invest_confirmed: null,
      pct_surplus_invest_pending: null,
      pct_surplus_to_debt: null,
      pct_excess_to_invest: null,
      operating_cushion: 0,
    });
  });

  it('lee meses con un decimal, porcentajes y el colchón', () => {
    const parsed = parsePlanSettings(
      form({ emergencyMonths: '4,5', expensiveDebtThreshold: '15', cushion: '949.000' }),
    );
    expect(parsed.ok && parsed.record).toMatchObject({
      emergency_months_override: 4.5,
      expensive_debt_threshold: 0.15,
      operating_cushion: 949_000,
    });
  });

  it('rechaza 0 meses, más de 24 y porcentajes fuera de 0 a 100', () => {
    for (const emergencyMonths of ['0', '25', '3,25']) {
      const parsed = parsePlanSettings(form({ emergencyMonths }));
      expect(!parsed.ok && parsed.errors.emergencyMonths).toBe('invalidMonths');
    }
    const parsed = parsePlanSettings(form({ pctSurplusToDebt: '150' }));
    expect(!parsed.ok && parsed.errors.pctSurplusToDebt).toBe('invalidPercent');
  });
});
