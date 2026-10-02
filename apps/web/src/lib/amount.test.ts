import { describe, expect, it } from 'vitest';

import { amountToText, parseAmount } from './amount';

describe('parseAmount', () => {
  it.each([
    ['130000', 130_000],
    ['130.000', 130_000],
    ['1.750.905', 1_750_905],
    ['130.000,5', 130_000.5],
    ['909,21', 909.21],
    [' $ 1.200 ', 1_200],
    ['1.200 €', 1_200],
    ['COP 50.000', 50_000],
    ['0', 0],
  ])('"%s" es %d', (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });

  it('vacío es null', () => {
    expect(parseAmount('  ')).toBeNull();
  });

  it.each(['-5', 'abc', '1,234,5', '12.34', '1.2345', '1,999', '1e5', '99999999999999999'])(
    '"%s" no es un importe',
    (text) => {
      expect(parseAmount(text)).toBeNaN();
    },
  );
});

describe('amountToText', () => {
  it('se vuelve a leer igual', () => {
    for (const value of [1_750_905, 130_000.5, 0]) {
      expect(parseAmount(amountToText(value, 'es-CO'))).toBe(value);
      expect(parseAmount(amountToText(value, 'es-ES'))).toBe(value);
    }
    expect(amountToText(null, 'es-CO')).toBe('');
  });
});
