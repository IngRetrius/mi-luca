import { describe, expect, it } from 'vitest';

import { parseInvestment, parseInvestmentSettings, parseRiskProfile } from './validation';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe('parseInvestment', () => {
  it('arma una inversión en dólares sin tramo', () => {
    const parsed = parseInvestment(
      form({ name: 'Plataforma A', bucket: '', balance: '1.500,50', currency: 'USD' }),
      { currencies: ['COP', 'USD'] },
    );
    expect(parsed.ok && parsed.record).toEqual({
      name: 'Plataforma A',
      bucket: null,
      balance: 1500.5,
      currency: 'USD',
      note: null,
    });
  });

  it('pide el saldo y rechaza números de cuenta', () => {
    const parsed = parseInvestment(
      form({ name: 'Cuenta 1234 5678 9012', bucket: 'crecimiento', balance: '', currency: 'COP' }),
      { currencies: ['COP'] },
    );
    expect(!parsed.ok && parsed.errors).toEqual({
      name: 'looksLikeAccount',
      balance: 'missingAmount',
    });
  });
});

describe('parseRiskProfile', () => {
  it('las respuestas pueden quedar sin responder; la posición vacía es la mitad', () => {
    const parsed = parseRiskProfile(form({ dropReaction: 'esperaria', variableIncome: 'no' }));
    expect(parsed.ok && parsed.answers).toEqual({
      drop_reaction: 'esperaria',
      experience: null,
      horizon: null,
    });
    expect(parsed.ok && parsed.advisor).toEqual({
      variable_income_override: false,
      dependents_override: null,
      range_position: 0.5,
    });
  });

  it('la posición va de 0 a 100', () => {
    expect(parseRiskProfile(form({ rangePosition: '80' }))).toMatchObject({
      ok: true,
      advisor: { range_position: 0.8 },
    });
    expect(parseRiskProfile(form({ rangePosition: '120' }))).toMatchObject({
      ok: false,
      errors: { rangePosition: 'invalidPercent' },
    });
  });
});

describe('parseInvestmentSettings', () => {
  it('vacío es la metodología; edad entera y rendimientos prudentes', () => {
    expect(parseInvestmentSettings(form({}))).toMatchObject({
      ok: true,
      record: { retirement_age: null, real_return_growth: null, growth_floor: null },
    });
    expect(
      parseInvestmentSettings(form({ retirementAge: '67', realReturnGrowth: '4,5' })),
    ).toMatchObject({ ok: true, record: { retirement_age: 67, real_return_growth: 0.045 } });
    expect(
      parseInvestmentSettings(form({ retirementAge: '25', realReturnStability: '60' })),
    ).toMatchObject({
      ok: false,
      errors: { retirementAge: 'invalidAge', realReturnStability: 'returnTooHigh' },
    });
  });
});
