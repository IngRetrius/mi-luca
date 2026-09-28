import { describe, expect, it } from 'vitest';

import { missingRates, toBase, toBaseCompat, type FxContext } from './to-base';

const colombia: FxContext = { baseCurrency: 'COP', ratesToBase: { USD: 3100 } };

describe('toBase', () => {
  it('deja igual un importe en la moneda base', () => {
    expect(toBase({ amount: 5_800_000, currency: 'COP' }, colombia)).toBe(5_800_000);
  });

  it('convierte con la tasa del cliente', () => {
    expect(toBase({ amount: 1976, currency: 'USD' }, colombia)).toBe(6_125_600);
  });

  it('devuelve undefined si la moneda no tiene tasa', () => {
    expect(toBase({ amount: 100, currency: 'EUR' }, colombia)).toBeUndefined();
  });
});

describe('toBaseCompat (plantilla)', () => {
  it('vale 0 si falta la tasa, como N(tasa) en Excel', () => {
    expect(
      toBaseCompat({ amount: 1976, currency: 'USD' }, { baseCurrency: 'COP', ratesToBase: {} }),
    ).toBe(0);
  });

  it('vale 0 si el importe es 0', () => {
    expect(toBaseCompat({ amount: 0, currency: 'USD' }, colombia)).toBe(0);
  });

  it('coincide con toBase cuando hay tasa', () => {
    expect(toBaseCompat({ amount: 750, currency: 'USD' }, colombia)).toBe(2_325_000);
  });
});

describe('missingRates', () => {
  it('lista cada moneda sin tasa una sola vez', () => {
    const monies = [
      { amount: 1, currency: 'EUR' },
      { amount: 2, currency: 'USD' },
      { amount: 3, currency: 'EUR' },
      { amount: 4, currency: 'COP' },
    ];
    expect(missingRates(monies, colombia)).toEqual(['EUR']);
  });
});
