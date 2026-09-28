import { describe, expect, it } from 'vitest';

import { currencyCodeSchema, fxRatesSchema, moneySchema } from './money';

describe('moneySchema', () => {
  it('acepta un importe con moneda ISO 4217', () => {
    expect(moneySchema.parse({ amount: 130000, currency: 'COP' })).toEqual({
      amount: 130000,
      currency: 'COP',
    });
  });

  it('rechaza códigos de moneda que no son ISO 4217', () => {
    expect(currencyCodeSchema.safeParse('usd').success).toBe(false);
    expect(currencyCodeSchema.safeParse('EURO').success).toBe(false);
  });

  it('rechaza importes no finitos', () => {
    expect(
      moneySchema.safeParse({ amount: Number.POSITIVE_INFINITY, currency: 'EUR' }).success,
    ).toBe(false);
  });
});

describe('fxRatesSchema', () => {
  it('exige tasas positivas', () => {
    expect(fxRatesSchema.safeParse({ USD: 3100 }).success).toBe(true);
    expect(fxRatesSchema.safeParse({ USD: 0 }).success).toBe(false);
  });
});
